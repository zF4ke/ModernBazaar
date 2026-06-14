package com.modernbazaar.core.dto;

import com.modernbazaar.core.domain.ReferralCode;
import java.time.OffsetDateTime;

public record ReferralCodeDTO(
        Long id,
        String userId,
        String code,
        int conversions,
        OffsetDateTime createdAt
) {
    public static ReferralCodeDTO of(ReferralCode r) {
        return new ReferralCodeDTO(r.getId(), r.getUserId(), r.getCode(), r.getConversions(), r.getCreatedAt());
    }
}
