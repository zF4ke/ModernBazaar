package com.modernbazaar.core.api.dto;

import com.modernbazaar.core.domain.UserSubscription;

/** Admin view of a user's subscription row. */
public record AdminUserDTO(
        String userId,
        String planSlug,
        String status,
        String currentPeriodEnd,
        String createdAt,
        String updatedAt,
        String stripeCustomerId
) {
    public static AdminUserDTO of(UserSubscription s) {
        return new AdminUserDTO(
                s.getUserId(),
                s.getPlanSlug(),
                s.getStatus(),
                s.getCurrentPeriodEnd() == null ? null : s.getCurrentPeriodEnd().toString(),
                s.getCreatedAt() == null ? null : s.getCreatedAt().toString(),
                s.getUpdatedAt() == null ? null : s.getUpdatedAt().toString(),
                s.getStripeCustomerId()
        );
    }
}
