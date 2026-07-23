package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "referral_earning", indexes = {
        @Index(name = "idx_referral_earning_code", columnList = "code"),
        @Index(name = "idx_referral_earning_eligible", columnList = "eligible_at"),
        @Index(name = "idx_referral_earning_charge", columnList = "stripe_charge_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReferralEarning {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "stripe_invoice_id", nullable = false, unique = true, length = 255)
    private String stripeInvoiceId;

    @Column(name = "stripe_charge_id", length = 255)
    private String stripeChargeId;

    @Column(nullable = false, length = 40)
    private String code;

    @Column(name = "referred_user_id", nullable = false, length = 100)
    private String referredUserId;

    @Column(nullable = false, length = 8)
    private String currency;

    @Column(name = "net_revenue_cents", nullable = false)
    private long netRevenueCents;

    @Column(name = "refunded_cents", nullable = false)
    private long refundedCents;

    @Column(name = "commission_cents", nullable = false)
    private long commissionCents;

    @Column(name = "occurred_at", nullable = false)
    private OffsetDateTime occurredAt;

    @Column(name = "eligible_at", nullable = false)
    private OffsetDateTime eligibleAt;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (status == null) status = "earned";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
