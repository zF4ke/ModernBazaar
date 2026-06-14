package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

/**
 * A referral code owned by one user. {@code conversions} is incremented by the
 * billing webhook on the referred user's first successful payment (carried as
 * {@code meta.custom_data.ref} through checkout) — see ADMIN_SUITE_PLAN §5.3.
 */
@Entity
@Table(name = "referral_code",
        indexes = {
                @Index(name = "idx_referral_code_user", columnList = "user_id", unique = true),
                @Index(name = "idx_referral_code_code", columnList = "code", unique = true)
        })
@Getter @Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReferralCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true, length = 100)
    private String userId;

    @Column(name = "code", nullable = false, unique = true, length = 40)
    private String code;

    @Column(name = "conversions", nullable = false)
    private int conversions;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
