package com.modernbazaar.core.api.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for creating or updating subscription plans.
 * 
 * @param slug Unique identifier for the plan (e.g., "starter", "flipper", "elite")
 * @param name Human-readable name for the plan
 * @param stripePriceId Stripe price ID for paid plans (null for free plans)
 * @param featuresJson JSON string containing plan features and limits
 * @param active Whether the plan is currently active
 */
public record CreateUpdatePlanRequestDTO(
        @NotBlank String slug,
        @NotBlank String name,
        String stripePriceId,
        @NotBlank String featuresJson,
        Boolean active
) {}
