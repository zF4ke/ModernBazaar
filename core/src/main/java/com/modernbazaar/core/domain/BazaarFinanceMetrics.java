package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Métricas financeiras pré-computadas para janelas fixas (ex: 1h, 6h, 48h) a partir de bazaar_hour_summary.
 * Reduz custo de cálculo on-demand no FlippingScorer.
 */
@Entity
@Table(name = "bazaar_finance_metrics",
       uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "window_hours"}),
       indexes = { @Index(columnList = "product_id"), @Index(columnList = "window_hours") })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BazaarFinanceMetrics {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @Column(name = "product_id", nullable = false, updatable = false)
    private String productId;

    @Column(name = "window_hours", nullable = false, updatable = false)
    private int windowHours;

    @Column(name = "computed_at", nullable = false)
    private Instant computedAt;

    @Column(name = "observations", nullable = false)
    private int observations; // N horas agregadas (<= windowHours)

    // preços BUY
    private double avgOpenInstantBuy;
    private double avgCloseInstantBuy;
    private double avgMinInstantBuy;
    private double avgMaxInstantBuy;

    // preços SELL
    private double avgOpenInstantSell;
    private double avgCloseInstantSell;
    private double avgMinInstantSell;
    private double avgMaxInstantSell;

    // competição / deltas
    private double avgCreatedBuyOrders;
    private double avgCreatedSellOrders;
    private double avgDeltaBuyOrders;
    private double avgDeltaSellOrders;
    private double avgAddedItemsBuyOrders;
    private double avgAddedItemsSellOrders;

    // fluxo insta-trades
    private double avgInstaBoughtItems;
    private double avgInstaSoldItems;
}

