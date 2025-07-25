package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "bazaar_product_snapshot",
        indexes = {@Index(columnList = "product_id"), @Index(columnList = "lastUpdated")})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class BazaarProductSnapshot {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private String productId;

    private Instant lastUpdated;    // from the API
    private Instant fetchedAt;      // when we polled

    @Lob
    @Column(columnDefinition = "jsonb")
    private String sellSummaryJson;

    @Lob
    @Column(columnDefinition = "jsonb")
    private String buySummaryJson;

    @Lob
    @Column(columnDefinition = "jsonb")
    private String quickStatusJson;
}
