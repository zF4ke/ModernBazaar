package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

/**
 * Feedback captured when a user cancels their subscription. Lets us learn why
 * people churn. One row per cancellation request.
 */
@Entity
@Table(name = "subscription_cancellation",
        indexes = { @Index(name = "idx_subcancel_user", columnList = "user_id") })
@Getter @Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SubscriptionCancellation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;

    @Column(name = "plan_slug", length = 50)
    private String planSlug;

    @Column(name = "reason", length = 80)
    private String reason;

    @Column(name = "comment", length = 2000)
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
