package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import java.time.OffsetDateTime;

@Entity
@Table(name = "plan")
@Getter @Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "slug", nullable = false, unique = true, length = 50)
    private String slug; // free | flipper | elite

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "stripe_price_id")
    private String stripePriceId; // nullable for free plan

    @JdbcTypeCode(java.sql.Types.LONGVARCHAR)
    @Column(name = "features_json", nullable = false, columnDefinition = "text")
    private String featuresJson; // store serialized JSON string of features/limits

    @Column(name = "active", nullable = false)
    private boolean active;

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

