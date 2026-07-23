package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

/** One deduplicated visitor to a referral link (/r/{code}). */
@Entity
@Table(name = "referral_click", indexes = {
        @Index(name = "idx_referral_click_code", columnList = "code"),
        @Index(name = "idx_referral_click_time", columnList = "clicked_at"),
})
@Getter @Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReferralClick {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, length = 40)
    private String code;

    @Column(name = "visitor_key", length = 64)
    private String visitorKey;

    @Column(name = "clicked_at", nullable = false, updatable = false)
    private OffsetDateTime clickedAt;

    @PrePersist
    void onCreate() {
        if (clickedAt == null) clickedAt = OffsetDateTime.now();
    }
}
