package com.modernbazaar.core.dto;

import com.modernbazaar.core.domain.ReferralPayout;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record ReferralPayoutDTO(
        Long id,
        String code,
        long amountCents,
        LocalDate periodStart,
        LocalDate periodEnd,
        String status,
        String note,
        OffsetDateTime createdAt,
        OffsetDateTime paidAt
) {
    public static ReferralPayoutDTO of(ReferralPayout p) {
        return new ReferralPayoutDTO(p.getId(), p.getCode(), p.getAmountCents(), p.getPeriodStart(),
                p.getPeriodEnd(), p.getStatus(), p.getNote(), p.getCreatedAt(), p.getPaidAt());
    }
}
