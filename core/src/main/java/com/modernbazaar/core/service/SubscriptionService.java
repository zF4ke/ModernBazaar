package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.Plan;
import com.modernbazaar.core.domain.UserSubscription;
import com.modernbazaar.core.repository.PlanRepository;
import com.modernbazaar.core.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    @Transactional
    public void applyStripeWebhook(String priceId,
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
        log.info("Assinatura atualizada via webhook user={} plan={} status={}", userId, plan.getSlug(), sub.getStatus());
    }
}
