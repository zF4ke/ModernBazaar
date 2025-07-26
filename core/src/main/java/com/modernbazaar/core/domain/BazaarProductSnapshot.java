package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bazaar_product_snapshot",
        indexes = {
                @Index(columnList = "product_id"),
                @Index(columnList = "last_updated")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BazaarProductSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * FK back to the BazaarItem master row.
     * Populated lazily, not part of the builder.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    // cascade = { CascadeType.PERSIST, CascadeType.MERGE } was causing a memory leak
    @JoinColumn(name = "product_id", insertable = false, updatable = false)
    @ToString.Exclude
    private BazaarItem item;

    /** The Hypixel product ID string. */
    @Column(name = "product_id", nullable = false)
    private String productId;

    /**
     * When Hypixel last updated its data (ms since epoch).
     * Persists to the column `last_updated`.
     */
    @Column(name = "last_updated", nullable = false)
    private Instant lastUpdated;

    /**
     * Our own poll timestamp—when we fetched from Hypixel.
     * Persists to `fetched_at`.
     */
    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt;

    /**
     * All the BUY entries, in exactly the order they were inserted.
     * Formerly quickStatus.sellSummary
     */
    @OneToMany(mappedBy = "snapshot", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "order_index")
    @Builder.Default
    private List<BuyOrderEntry> buyOrders = new ArrayList<>();

    /**
     * All the SELL entries, in exactly the order they were inserted.
     * Formerly quickStatus.buySummary
     */
    @OneToMany(mappedBy = "snapshot", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "order_index")
    @Builder.Default
    private List<SellOrderEntry> sellOrders = new ArrayList<>();

    /**
     * Weighted average of the top 2% of sell orders by volume.
     * Formerly quickStatus.sellPrice.
     */
    @Column(name = "weighted_two_percent_sell_price")
    private double weightedTwoPercentSellPrice;

    /**
     * Total transacted volume over the last 7 days (live + historic).
     * Formerly quickStatus.sellMovingWeek.
     */
    @Column(name = "sell_moving_week")
    private long sellMovingWeek;

    /**
     * Count of active sell orders in the bazaar.
     * Formerly quickStatus.sellOrders.
     */
    @Column(name = "active_sell_orders_count")
    private int activeSellOrdersCount;

    /**
     * Weighted average of the top 2% of buy orders by volume.
     * Formerly quickStatus.buyPrice.
     */
    @Column(name = "weighted_two_percent_buy_price")
    private double weightedTwoPercentBuyPrice;

    /**
     * Total transacted volume over the last 7 days (live + historic).
     * Formerly quickStatus.buyMovingWeek.
     */
    @Column(name = "buy_moving_week")
    private long buyMovingWeek;

    /**
     * Count of active buy orders in the bazaar.
     * Formerly quickStatus.buyOrders.
     */
    @Column(name = "active_buy_orders_count")
    private int activeBuyOrdersCount;

    @Override
    public String toString() {
        return "BazaarProductSnapshot{" +
                "id=" + id +
                ", productId='" + productId + '\'' +
                ", lastUpdated=" + lastUpdated +
                ", fetchedAt=" + fetchedAt +
                ", buyOrders=" + buyOrders +
                ", sellOrders=" + sellOrders +
                ", weightedTwoPercentSellPrice=" + weightedTwoPercentSellPrice +
                ", sellMovingWeek=" + sellMovingWeek +
                ", activeSellOrdersCount=" + activeSellOrdersCount +
                ", weightedTwoPercentBuyPrice=" + weightedTwoPercentBuyPrice +
                ", buyMovingWeek=" + buyMovingWeek +
                ", activeBuyOrdersCount=" + activeBuyOrdersCount +
                '}';
        }
}
