package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/** A payout owed to (or paid to) a creator for their referral code. */
@Entity
@Table(name = "referral_payout", indexes = {
        @Index(name = "idx_referral_payout_code", columnList = "code"),
})
@Getter @Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReferralPayout {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, length = 40)
    private String code;

    @Column(name = "amount_cents", nullable = false)
    private long amountCents;

    @Column(name = "period_start")
    private LocalDate periodStart;

    @Column(name = "period_end")
    private LocalDate periodEnd;

    /** pending | paid */
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (status == null) status = "pending";
    }
}
