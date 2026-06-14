package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

/**
 * Records that a referred user converted (first paid subscription) against a
 * referral code. {@code referredUserId} is unique so a replayed (but validly
 * signed) webhook cannot double-count a conversion.
 */
@Entity
@Table(name = "referral_conversion",
        indexes = {
                @Index(name = "idx_referral_conversion_referred", columnList = "referred_user_id", unique = true),
                @Index(name = "idx_referral_conversion_code", columnList = "code")
        })
@Getter @Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReferralConversion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, length = 40)
    private String code;

    @Column(name = "referred_user_id", nullable = false, unique = true, length = 100)
    private String referredUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
