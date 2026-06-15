package com.modernbazaar.core.api.dto;

import java.time.OffsetDateTime;

/**
 * One cancellation-feedback row for the admin churn view. Mirrors
 * {@code subscription_cancellation} — why a user left, captured at cancel time.
 */
public record AdminCancellationDTO(
        Long           id,
        String         userId,
        String         planSlug,
        String         reason,
        String         comment,
        OffsetDateTime createdAt
) {}
