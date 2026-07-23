package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

/**
 * A free account attributed to a referral code (the mb_ref cookie was present
 * when the user was first provisioned). One row per user, ever — the first
 * code that brought them in keeps the attribution.
 */
@Entity
@Table(name = "referral_signup", indexes = {
        @Index(name = "idx_referral_signup_code", columnList = "code"),
})
@Getter @Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReferralSignup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, length = 40)
    private String code;

    @Column(name = "user_id", nullable = false, unique = true, length = 100)
    private String userId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
