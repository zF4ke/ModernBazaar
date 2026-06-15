package com.modernbazaar.core.service;

import com.modernbazaar.core.api.dto.AdminCancellationDTO;
import com.modernbazaar.core.api.dto.PagedResponseDTO;
import com.modernbazaar.core.api.dto.SubscriptionResponseDTO;
import com.modernbazaar.core.domain.Plan;
import com.modernbazaar.core.domain.SubscriptionCancellation;
import com.modernbazaar.core.domain.UserSubscription;
import com.modernbazaar.core.repository.PlanRepository;
import com.modernbazaar.core.repository.SubscriptionCancellationRepository;
import com.modernbazaar.core.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final PlanRepository planRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final Auth0ManagementService auth0ManagementService;
    private final SubscriptionCancellationRepository cancellationRepository;

    @Value("${lemonsqueezy.api-key:}")
    private String lemonSqueezyApiKey;

    public Optional<UserSubscription> findCurrentForUser(String userId) {
        return userSubscriptionRepository.findFirstByUserIdOrderByIdDesc(userId);
    }

    /**
     * The feature scopes a user is actually entitled to, derived from their DB plan
     * (the source of truth) — NOT the Auth0 token, which can be stale/misconfigured.
     * Free gets market data only; flipper adds flipping; elite adds manipulation.
     * A cancelled plan keeps access until the period end.
     */
    @Transactional(readOnly = true)
    public Set<String> entitledScopes(String userId) {
        Set<String> scopes = new LinkedHashSet<>();
        scopes.add("read:market_data"); // every signed-in user, including free
        var sub = findCurrentForUser(userId).orElse(null);
        if (sub == null) return scopes;
        boolean active = "active".equalsIgnoreCase(sub.getStatus())
                || ("canceled".equalsIgnoreCase(sub.getStatus()) && sub.getCurrentPeriodEnd() != null
                    && sub.getCurrentPeriodEnd().isAfter(OffsetDateTime.now()));
        if (!active) return scopes;
        String plan = sub.getPlanSlug() == null ? "free" : sub.getPlanSlug().toLowerCase();
        if (plan.equals("flipper") || plan.equals("elite")) scopes.add("use:bazaar-flipping");
        if (plan.equals("elite")) scopes.add("use:bazaar-manipulation");
        return scopes;
    }

    /**
     * Admin churn view: cancellation feedback, newest first, paginated. One row per
     * cancellation request (the "why they left" captured in {@link #requestCancellation}).
     */
    @Transactional(readOnly = true)
    public PagedResponseDTO<AdminCancellationDTO> listCancellations(int page, int limit) {
        if (limit <= 0) limit = 50;
        if (page < 0) page = 0;
        var rows = cancellationRepository.findAll(
                PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PagedResponseDTO.fromPage(rows.map(c -> new AdminCancellationDTO(
                c.getId(), c.getUserId(), c.getPlanSlug(), c.getReason(), c.getComment(), c.getCreatedAt())));
    }

    public boolean isEntitled(String userId, String scope) {
        return entitledScopes(userId).contains(scope);
    }

    @Transactional
    public UserSubscription ensureFreePlan(String userId) {
        try {
            var existing = findCurrentForUser(userId);
            if (existing.isPresent()) {
                log.debug("User {} already has subscription: {}", userId, existing.get().getPlanSlug());
                return existing.get();
            }
            
            // garante existência do plano free
            var freePlan = planRepository.findBySlug("free").orElseGet(() -> {
                try {
                    return planRepository.save(Plan.builder()
                            .slug("free")
                            .name("Free")
                            .stripePriceId(null)
                            .featuresJson("{\"limits\":{\"maxItemsPerPage\":50}}")
                            .active(true)
                            .build());
                } catch (Exception e) {
                    log.error("Failed to create free plan for user={}", userId, e);
                    // Return a default plan object if save fails
                    return Plan.builder()
                            .slug("free")
                            .name("Free")
                            .stripePriceId(null)
                            .featuresJson("{\"limits\":{\"maxItemsPerPage\":50}}")
                            .active(true)
                            .build();
                }
            });
            
            var sub = UserSubscription.builder()
                    .userId(userId)
                    .planSlug(freePlan.getSlug())
                    .status("active")
                    .currentPeriodEnd(null)
                    .build();
            sub = userSubscriptionRepository.save(sub);
            log.info("✅ Automatically created FREE plan subscription for new user: {}", userId);
            return sub;
        } catch (Exception e) {
            log.error("Failed to ensure free plan for user={}", userId, e);
            // Return a default subscription if everything fails
            return UserSubscription.builder()
                    .userId(userId)
                    .planSlug("free")
                    .status("active")
                    .currentPeriodEnd(null)
                    .build();
        }
    }

    /** Stores the user's email/display name on their subscription so admins can identify them. */
    @Transactional
    public void setContactInfo(String userId, String email, String name) {
        if ((email == null || email.isBlank()) && (name == null || name.isBlank())) return;
        userSubscriptionRepository.findFirstByUserIdOrderByIdDesc(userId).ifPresent(sub -> {
            if (email != null && !email.isBlank()) sub.setEmail(email);
            if (name != null && !name.isBlank()) sub.setName(name);
            userSubscriptionRepository.save(sub);
        });
    }

    /**
     * Apply a payment-provider (Lemon Squeezy) subscription event. priceId is the
     * provider's variant id, mapped to a local plan via Plan.stripePriceId (the
     * column is reused as a generic provider price/variant id).
     */
    @Transactional
    public void applyProviderWebhook(String priceId,
                                     String customerId,
                                     String subscriptionId,
                                     Long periodEndEpoch,
                                     String status,
                                     String userId) {
        if (userId == null || userId.isBlank()) {
            log.warn("Webhook sem userId - ignorando");
            return;
        }
        if (priceId == null || priceId.isBlank()) {
            log.warn("Webhook sem priceId - ignorando user={}", userId);
            return;
        }
        var planOpt = planRepository.findByStripePriceId(priceId);
        if (planOpt.isEmpty()) {
            log.warn("PriceId {} não mapeado para nenhum plano (user={})", priceId, userId);
            return;
        }
        var plan = planOpt.get();
        var existing = userSubscriptionRepository.findFirstByUserIdOrderByIdDesc(userId);
        // Capture the prior subscription BEFORE we overwrite the row — if a different,
        // still-active subscription is being replaced, it's an orphan that keeps billing.
        String priorSubId = existing.map(UserSubscription::getStripeSubscriptionId).orElse(null);
        boolean priorActive = existing.map(s -> "active".equalsIgnoreCase(s.getStatus())).orElse(false);

        var sub = existing.orElse(UserSubscription.builder()
                        .userId(userId)
                        .build());
        sub.setPlanSlug(plan.getSlug());
        sub.setStripeCustomerId(customerId);
        sub.setStripeSubscriptionId(subscriptionId);
        sub.setStatus(status == null ? "active" : status);
        sub.setCurrentPeriodEnd(periodEndEpoch == null ? null : OffsetDateTime.ofInstant(Instant.ofEpochSecond(periodEndEpoch), ZoneOffset.UTC));
        userSubscriptionRepository.save(sub);

        // Safety net against double billing: the user checked out again (a NEW subscription)
        // instead of changing plans, while a DIFFERENT subscription was still active. The
        // hosted checkout can't extend/merge, so the old one would keep charging — and once
        // we overwrite the row above we'd lose its id. Cancel the orphan on Lemon Squeezy
        // now. Best-effort; on failure we log loudly so it can be cancelled by hand.
        boolean replacingDifferentActiveSub = priorActive
                && priorSubId != null && !priorSubId.isBlank()
                && subscriptionId != null && !priorSubId.equals(subscriptionId)
                && "active".equalsIgnoreCase(sub.getStatus());
        if (replacingDifferentActiveSub) {
            if (cancelOnLemonSqueezy(priorSubId)) {
                log.warn("Duplicate subscription for user={}: new sub {} replaced still-active old sub {} — cancelled the old one on Lemon Squeezy to prevent double billing.",
                        userId, subscriptionId, priorSubId);
            } else {
                log.error("DOUBLE-BILLING RISK user={}: new sub {} replaced still-active old sub {} but it could NOT be cancelled (no LEMONSQUEEZY_API_KEY or API error). Cancel sub {} manually in Lemon Squeezy.",
                        userId, subscriptionId, priorSubId, priorSubId);
            }
        }

        // Entitlement follows billing: grant the plan's Auth0 role (which carries the
        // feature scopes) while active — or within a still-paid cancelled period — and
        // otherwise revoke down to Free. This is what makes upgrades actually unlock
        // features and cancel/expiry actually remove them. Best-effort (never throws).
        boolean entitled = "active".equalsIgnoreCase(sub.getStatus())
                || ("canceled".equalsIgnoreCase(sub.getStatus())
                    && sub.getCurrentPeriodEnd() != null
                    && sub.getCurrentPeriodEnd().isAfter(OffsetDateTime.now()));
        String entitledPlan = entitled ? plan.getSlug() : "free";
        auth0ManagementService.syncPlanRoles(userId, entitledPlan);

        log.info("Assinatura atualizada via webhook user={} plan={} status={} entitled={}", userId, plan.getSlug(), sub.getStatus(), entitledPlan);
    }

    /**
     * User-initiated cancellation. Always records the feedback (why they're leaving),
     * then cancels on Lemon Squeezy when the API key + subscription id are present
     * (access stays until the period end; the webhook later confirms). Returns the
     * current subscription so the UI can show the remaining time.
     */
    @Transactional
    public SubscriptionResponseDTO requestCancellation(String userId, String reason, String comment) {
        var sub = userSubscriptionRepository.findFirstByUserIdOrderByIdDesc(userId).orElse(null);

        cancellationRepository.save(SubscriptionCancellation.builder()
                .userId(userId)
                .planSlug(sub == null ? null : sub.getPlanSlug())
                .reason(reason == null ? null : reason.substring(0, Math.min(reason.length(), 80)))
                .comment(comment == null ? null : comment.substring(0, Math.min(comment.length(), 2000)))
                .build());

        if (sub == null) return null;
        Plan plan = planRepository.findBySlug(sub.getPlanSlug()).orElse(null);

        boolean cancelled = cancelOnLemonSqueezy(sub.getStripeSubscriptionId());
        if (cancelled) {
            sub.setStatus("canceled");
            userSubscriptionRepository.save(sub);
            log.info("User {} cancelled subscription via Lemon Squeezy. Access until {}", userId, sub.getCurrentPeriodEnd());
        } else {
            log.info("Cancellation feedback recorded for user {} (Lemon Squeezy not called: no API key or subscription id)", userId);
        }
        return SubscriptionResponseDTO.from(sub, plan);
    }

    /**
     * Undo a pending cancellation while still within the paid period: tell Lemon Squeezy
     * to resume billing and flip the local status back to active. The webhook confirms later.
     * Safe no-op if there's nothing to resume (returns the current subscription unchanged).
     */
    @Transactional
    public SubscriptionResponseDTO requestResume(String userId) {
        var sub = userSubscriptionRepository.findFirstByUserIdOrderByIdDesc(userId).orElse(null);
        if (sub == null) return null;
        Plan plan = planRepository.findBySlug(sub.getPlanSlug()).orElse(null);

        boolean isCancelled = "canceled".equalsIgnoreCase(sub.getStatus());
        boolean stillWithinPeriod = sub.getCurrentPeriodEnd() == null
                || sub.getCurrentPeriodEnd().isAfter(OffsetDateTime.now());
        if (isCancelled && stillWithinPeriod && resumeOnLemonSqueezy(sub.getStripeSubscriptionId())) {
            sub.setStatus("active");
            userSubscriptionRepository.save(sub);
            log.info("User {} resumed subscription; active again until {}", userId, sub.getCurrentPeriodEnd());
        } else {
            log.info("Resume requested by user {} but not applied (status={}, withinPeriod={})",
                    userId, sub.getStatus(), stillWithinPeriod);
        }
        return SubscriptionResponseDTO.from(sub, plan);
    }

    /** Cancels a Lemon Squeezy subscription via the API (no-op without an API key / id). */
    private boolean cancelOnLemonSqueezy(String subscriptionId) {
        return setLemonSqueezyCancelled(subscriptionId, true);
    }

    /** Resumes (un-cancels) a Lemon Squeezy subscription via the API (no-op without an API key / id). */
    private boolean resumeOnLemonSqueezy(String subscriptionId) {
        return setLemonSqueezyCancelled(subscriptionId, false);
    }

    /** PATCHes a Lemon Squeezy subscription's {@code cancelled} flag. False on missing key/id or error. */
    private boolean setLemonSqueezyCancelled(String subscriptionId, boolean cancelled) {
        if (lemonSqueezyApiKey == null || lemonSqueezyApiKey.isBlank()
                || subscriptionId == null || subscriptionId.isBlank()) {
            return false;
        }
        try {
            String body = "{\"data\":{\"type\":\"subscriptions\",\"id\":\"" + subscriptionId
                    + "\",\"attributes\":{\"cancelled\":" + cancelled + "}}}";
            var req = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create("https://api.lemonsqueezy.com/v1/subscriptions/" + subscriptionId))
                    .header("Authorization", "Bearer " + lemonSqueezyApiKey)
                    .header("Accept", "application/vnd.api+json")
                    .header("Content-Type", "application/vnd.api+json")
                    .method("PATCH", java.net.http.HttpRequest.BodyPublishers.ofString(body))
                    .timeout(java.time.Duration.ofSeconds(10))
                    .build();
            var resp = java.net.http.HttpClient.newHttpClient()
                    .send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() / 100 == 2) return true;
            log.warn("Lemon Squeezy {} failed ({}): {}", cancelled ? "cancel" : "resume", resp.statusCode(), resp.body());
            return false;
        } catch (Exception e) {
            log.error("Lemon Squeezy {} error", cancelled ? "cancel" : "resume", e);
            return false;
        }
    }
}
