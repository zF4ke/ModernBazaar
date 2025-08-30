package com.modernbazaar.core.api.dto;

import com.modernbazaar.core.domain.Plan;
import com.modernbazaar.core.domain.UserSubscription;

import java.time.OffsetDateTime;

public record SubscriptionResponseDTO(
        String planSlug,
        String planName,
        String stripePriceId,
        String status,
        OffsetDateTime currentPeriodEnd,
        String featuresJson
) {
    public static SubscriptionResponseDTO from(UserSubscription sub, Plan plan) {
        return new SubscriptionResponseDTO(
                sub.getPlanSlug(),
                plan == null ? null : plan.getName(),
                plan == null ? null : plan.getStripePriceId(),
                sub.getStatus(),
                sub.getCurrentPeriodEnd(),
                plan == null ? null : plan.getFeaturesJson()
        );
    }

    public record PlanDTO(String slug, String name, String stripePriceId, boolean active, String featuresJson) {
        public static PlanDTO from(Plan p) {
            return new PlanDTO(p.getSlug(), p.getName(), p.getStripePriceId(), p.isActive(), p.getFeaturesJson());
        }
    }
}

