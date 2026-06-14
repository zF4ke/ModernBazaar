package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

/**
 * Admin-generated discount code. Tracked locally for analytics and gating; when
 * Lemon Squeezy billing is live the same code is mirrored as an LS discount so
 * the price is enforced by the Merchant of Record at checkout (see
 * docs/ADMIN_SUITE_PLAN.md §5.3).
 */
@Entity
@Table(name = "discount_code",
        indexes = { @Index(name = "idx_discount_code_code", columnList = "code", unique = true) })
@Getter @Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DiscountCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 40)
    private String code;

    @Column(name = "percent_off", nullable = false)
    private int percentOff; // 1..100

    @Column(name = "plan_slug", length = 50)
    private String planSlug; // null = applies to any plan

    @Column(name = "max_redemptions")
    private Integer maxRedemptions; // null = unlimited

    @Column(name = "redemptions", nullable = false)
    private int redemptions;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt; // null = never

    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    /** Whether the code can still be redeemed right now. */
    @Transient
    public boolean isRedeemable() {
        if (!active) return false;
        if (expiresAt != null && expiresAt.isBefore(OffsetDateTime.now())) return false;
        if (maxRedemptions != null && redemptions >= maxRedemptions) return false;
        return true;
    }
}
