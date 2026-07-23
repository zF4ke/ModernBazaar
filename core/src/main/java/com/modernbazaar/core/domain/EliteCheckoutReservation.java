package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "elite_checkout_reservation")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EliteCheckoutReservation {
    @Id
    @Column(name = "user_id", length = 100)
    private String userId;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
