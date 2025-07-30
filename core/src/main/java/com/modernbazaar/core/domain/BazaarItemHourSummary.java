package com.modernbazaar.core.domain;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Entity
@Table(name="bazaar_hour_summary",
        indexes={@Index(columnList="product_id"),
                @Index(columnList="hour_start")})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BazaarItemHourSummary {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @Column(nullable=false, updatable=false) private String  productId;
    @Column(nullable=false, updatable=false) private Instant hourStart; // 2025‑07‑28T17:00Z

    /* --- OHLC for BUY side (2% weighted price) ----------------------------- */
    private double openInstantBuyPrice;
    private double closeInstantBuyPrice;
    private double minInstantBuyPrice;
    private double maxInstantBuyPrice;

    /* --- OHLC for SELL side -------------------------------------------------- */
    private double openInstantSellPrice;
    private double closeInstantSellPrice;
    private double minInstantSellPrice;
    private double maxInstantSellPrice;

    /* --- raw volume & order‑book deltas ------------------------------------- */
    /** ∑ new sell orders opened in the hour */
    private long   newSellOrders;
    /** delta of active sell orders (close‑open) */
    private long   deltaNewSellOrders;

    private long   newBuyOrders;
    private long   deltaNewBuyOrders;

    /** total items listed in new sell orders */
    private long   itemsListedSellOrders;
    private long   itemsListedBuyOrders;

    /** total items insta‑sold / insta‑bought in the hour (quick‑trades) */
    private long   instaSoldItems;
    private long   instaBoughtItems;

    /* link back to minute points for debugging (lazy) */
    @OneToMany(mappedBy="hourSummary", fetch=FetchType.LAZY)
    private List<BazaarItemHourPoint> points;
}
