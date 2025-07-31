package com.modernbazaar.core.domain;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "bazaar_order_entry",
        indexes = {
                @Index(columnList = "snapshot_id"),
                @Index(columnList = "hour_point_id"),
                @Index(columnList = "side")
        })
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "side", discriminatorType = DiscriminatorType.STRING)
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)          // ← keep toBuilder()
public abstract class BazaarOrderEntry {

    /* ─────────────────────────  primary key  ─────────────────────────── */
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /* ───────────── master‑entity back‑refs (exactly one is non‑null) ─── */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "snapshot_id")
    private BazaarItemSnapshot snapshot;          // owning snapshot (heavy table)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hour_point_id")
    private BazaarItemHourPoint hourPoint;          // light table, 1:1 with snapshot

    /* ─────────────────────── order‑book columns ──────────────────────── */
    /** position in API array (0 = best price) */
    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    /** price per unit */
    @Column(name = "price_per_unit", nullable = false)
    private double pricePerUnit;

    /** total quantity at this price level */
    @Column(nullable = false)
    private long amount;

    /** number of distinct orders at this price */
    @Column(nullable = false)
    private int orders;
}

