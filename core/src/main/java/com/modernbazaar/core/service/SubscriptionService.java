package com.modernbazaar.core.service;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

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
        var sub = userSubscriptionRepository.findFirstByUserIdOrderByIdDesc(userId)
                .orElse(UserSubscription.builder()
                        .userId(userId)
                        .build());
        sub.setPlanSlug(plan.getSlug());
        sub.setStripeCustomerId(customerId);
        sub.setStripeSubscriptionId(subscriptionId);
        sub.setStatus(status == null ? "active" : status);
        sub.setCurrentPeriodEnd(periodEndEpoch == null ? null : OffsetDateTime.ofInstant(Instant.ofEpochSecond(periodEndEpoch), ZoneOffset.UTC));
        userSubscriptionRepository.save(sub);

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

    /** Cancels a Lemon Squeezy subscription via the API (no-op without an API key / id). */
    private boolean cancelOnLemonSqueezy(String subscriptionId) {
        if (lemonSqueezyApiKey == null || lemonSqueezyApiKey.isBlank()
                || subscriptionId == null || subscriptionId.isBlank()) {
            return false;
        }
        try {
            String body = "{\"data\":{\"type\":\"subscriptions\",\"id\":\"" + subscriptionId
                    + "\",\"attributes\":{\"cancelled\":true}}}";
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
            log.warn("Lemon Squeezy cancel failed ({}): {}", resp.statusCode(), resp.body());
            return false;
        } catch (Exception e) {
            log.error("Lemon Squeezy cancel error", e);
            return false;
        }
    }
}
