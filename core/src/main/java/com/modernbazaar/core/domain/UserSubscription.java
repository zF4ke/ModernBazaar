package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "user_subscription",
        indexes = {
                @Index(name = "idx_user_subscription_user", columnList = "user_id"),
                @Index(name = "idx_user_subscription_plan_slug", columnList = "plan_slug")
        })
@Getter @Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 100)
    private String userId; // matches IdP subject (sub claim)

    @Column(name = "stripe_customer_id", length = 100)
    private String stripeCustomerId;

    @Column(name = "stripe_subscription_id", length = 100)
    private String stripeSubscriptionId;

    @Column(name = "plan_slug", nullable = false, length = 50)
    private String planSlug; // foreign key logically to plan.slug

    @Column(name = "status", nullable = false, length = 50)
    private String status; // active | past_due | canceled | incomplete

    @Column(name = "current_period_end")
    private OffsetDateTime currentPeriodEnd;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        var now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}

