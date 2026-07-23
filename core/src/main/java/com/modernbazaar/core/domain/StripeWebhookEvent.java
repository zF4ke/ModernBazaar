package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "stripe_webhook_event")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StripeWebhookEvent {
    @Id
    @Column(name = "event_id", length = 255)
    private String eventId;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "received_at", nullable = false)
    private OffsetDateTime receivedAt;

    @Column(name = "processed_at")
    private OffsetDateTime processedAt;

    @Column(name = "last_error", length = 1000)
    private String lastError;
}
