package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * One‑to‑one copy of a 1‑minute Hypixel poll for a single product, stored
 * after we compress it into {@link BazaarItemHourSummary}.  Retains every field
 * from {@link BazaarItemSnapshot} so downstream jobs can be re‑run without
 * needing the heavy snapshot table.
 *
 * You *do not* store any of the derived “hour‑summary” metrics here.
 */
@Entity
@Table(name = "bazaar_hour_point",
        indexes = {
                @Index(columnList = "product_id"),
                @Index(columnList = "snapshot_time")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BazaarItemHourPoint {

    // ── PK / FK ─────────────────────────────────────────────────────────────
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Back‑pointer to the hour bucket this minute belongs to. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bazaar_hour_summary", nullable = false, updatable = false)
    @ToString.Exclude
    private BazaarItemHourSummary hourSummary;

    // ── snapshot identity ───────────────────────────────────────────────────
    @Column(name = "product_id", nullable = false, updatable = false)
    private String productId;

    /** Exact UTC time the minute poll was taken (truncated to *minute*). */
    @Column(name = "snapshot_time", nullable = false, updatable = false)
    private Instant snapshotTime;

    /** Epoch‑ms the Hypixel API marked inside its JSON (`lastUpdated`). */
    @Column(name = "api_last_updated", nullable = false, updatable = false)
    private Instant apiLastUpdated;

    // ── order‑book lists (same mapping style as BazaarItemSnapshot) ──────────
    @OneToMany(mappedBy = "hourPoint", cascade = CascadeType.ALL, orphanRemoval = true,
            fetch = FetchType.LAZY)
    @OrderColumn(name = "order_index")
    @Builder.Default
    @BatchSize(size = 50)
    private List<BuyOrderEntry> buyOrders = new ArrayList<>();


    @OneToMany(mappedBy = "hourPoint", cascade = CascadeType.ALL, orphanRemoval = true,
            fetch = FetchType.LAZY)
    @OrderColumn(name = "order_index")
    @Builder.Default
    @BatchSize(size = 50)
    private List<SellOrderEntry> sellOrders = new ArrayList<>();

    // ── weighted price & rolling volume stats ───────────────────────────────
    @Column(name = "weighted_two_percent_buy_price")
    private double weightedTwoPercentBuyPrice;

    @Column(name = "weighted_two_percent_sell_price")
    private double weightedTwoPercentSellPrice;

    @Column(name = "instant_buy_price")
    private double instantBuyPrice;

    @Column(name = "instant_sell_price")
    private double instantSellPrice;

    @Column(name = "buy_moving_week")
    private long buyMovingWeek;

    @Column(name = "sell_moving_week")
    private long sellMovingWeek;

    @Column(name = "buy_volume")
    private long buyVolume;

    @Column(name = "sell_volume")
    private long sellVolume;

    @Column(name = "active_buy_orders_count")
    private int activeBuyOrdersCount;

    @Column(name = "active_sell_orders_count")
    private int activeSellOrdersCount;

    // ── convenience helpers for change detection — NOT aggregated fields ────
    /** True if this minute point triggered the volatility threshold. */
    private boolean volatilitySpike;
}
