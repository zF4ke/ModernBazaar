package com.modernbazaar.core.api.dto;

import com.modernbazaar.core.domain.Plan;

/**
 * Data transfer object for subscription plans in admin operations.
 * 
 * @param slug Unique identifier for the plan
 * @param name Human-readable name for the plan
 * @param stripePriceId Stripe price ID for paid plans
 * @param active Whether the plan is currently active
 * @param featuresJson JSON string containing plan features and limits
 */
public record AdminPlanDTO(
        String slug, 
        String name, 
        String stripePriceId, 
        boolean active, 
        String featuresJson
) {
    /**
     * Creates an AdminPlanDTO from a Plan entity.
     * 
     * @param plan The Plan entity to convert
     * @return AdminPlanDTO representation of the plan
     */
    public static AdminPlanDTO from(Plan plan) {
        return new AdminPlanDTO(
            plan.getSlug(), 
            plan.getName(), 
            plan.getStripePriceId(), 
            plan.isActive(), 
            plan.getFeaturesJson()
        );
    }
}
