package com.modernbazaar.core.util;

import com.modernbazaar.core.domain.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class BazaarSnapshotToMinutePointMapper {

    /** How many price levels of the order-book we persist per kept snapshot */
    private static final int DEPTH = 30;

    /* ------------------------------------------------------------------ */
    /*  public API                                                        */
    /* ------------------------------------------------------------------ */

    public BazaarItemHourPoint toMinute(BazaarItemSnapshot s,
                                        BazaarItemHourSummary parent) {

        BazaarItemHourPoint p = new BazaarItemHourPoint();

        /* ——— header / FK columns ———————————————————————————————— */
        p.setHourSummary(parent);             // FK → summary (NOT NULL)
        p.setProductId(s.getProductId());     // NOT NULL
        p.setSnapshotTime(s.getFetchedAt());
        p.setApiLastUpdated(s.getLastUpdated());

        /* ——— instant prices & counts ———————————————————————————— */
        p.setInstantBuyPrice      (s.getInstantBuyPrice());
        p.setInstantSellPrice     (s.getInstantSellPrice());
        p.setActiveBuyOrdersCount (s.getActiveBuyOrdersCount());
        p.setActiveSellOrdersCount(s.getActiveSellOrdersCount());

        /* ——— optional metrics we still want to keep ————————————— */
        p.setWeightedTwoPercentBuyPrice (s.getWeightedTwoPercentBuyPrice());
        p.setWeightedTwoPercentSellPrice(s.getWeightedTwoPercentSellPrice());
        p.setBuyMovingWeek   (s.getBuyMovingWeek());
        p.setSellMovingWeek  (s.getSellMovingWeek());
        p.setBuyVolume   (s.getBuyVolume());
        p.setSellVolume  (s.getSellVolume());

        /* ——— copy first N levels of each side of the book ——————— */
        p.setBuyOrders (s.getBuyOrders().stream()
                .limit(DEPTH)
                .map(o -> copyBuy(o, p))
                .collect(Collectors.toList()));

        p.setSellOrders(s.getSellOrders().stream()
                .limit(DEPTH)
                .map(o -> copySell(o, p))
                .collect(Collectors.toList()));

        return p;
    }

    /* ------------------------------------------------------------------ */
    /*  private helpers – make NEW rows, no reflection, no cloning        */
    /* ------------------------------------------------------------------ */

    private BuyOrderEntry copyBuy(BuyOrderEntry src,
                                  BazaarItemHourPoint owner) {

        BuyOrderEntry b = new BuyOrderEntry();
        b.setHourPoint(owner);
        b.setOrderIndex   (src.getOrderIndex());
        b.setPricePerUnit (src.getPricePerUnit());
        b.setAmount       (src.getAmount());
        b.setOrders       (src.getOrders());
        return b;
    }

    private SellOrderEntry copySell(SellOrderEntry src,
                                    BazaarItemHourPoint owner) {

        SellOrderEntry s = new SellOrderEntry();
        s.setHourPoint(owner);
        s.setOrderIndex   (src.getOrderIndex());
        s.setPricePerUnit (src.getPricePerUnit());
        s.setAmount       (src.getAmount());
        s.setOrders       (src.getOrders());
        return s;
    }
}
