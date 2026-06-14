package com.modernbazaar.core.dto;

import com.modernbazaar.core.domain.DiscountCode;
import java.time.OffsetDateTime;

public record DiscountCodeDTO(
        Long id,
        String code,
        int percentOff,
        String planSlug,
        Integer maxRedemptions,
        int redemptions,
        OffsetDateTime expiresAt,
        boolean active,
        boolean redeemable,
        OffsetDateTime createdAt
) {
    public static DiscountCodeDTO of(DiscountCode d) {
        return new DiscountCodeDTO(
                d.getId(), d.getCode(), d.getPercentOff(), d.getPlanSlug(),
                d.getMaxRedemptions(), d.getRedemptions(), d.getExpiresAt(),
                d.isActive(), d.isRedeemable(), d.getCreatedAt());
    }
}
