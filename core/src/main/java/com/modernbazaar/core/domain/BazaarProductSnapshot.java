package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "bazaar_product_snapshot",
        indexes = {
                @Index(columnList = "product_id"),
                @Index(columnList = "lastUpdated")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BazaarProductSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Lazy link to the master record.  Not part of the builder. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false, cascade = { CascadeType.PERSIST, CascadeType.MERGE })
    @JoinColumn(name = "product_id", insertable = false, updatable = false)
    private BazaarItem item;

    @Column(name = "product_id", nullable = false)
    private String productId;

    private Instant lastUpdated;   // timestamp from the external API
    private Instant fetchedAt;     // when we polled

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String sellSummaryJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String buySummaryJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String quickStatusJson;
}
