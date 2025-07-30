package com.modernbazaar.core.util;

import com.modernbazaar.core.domain.*;
        import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BazaarSnapshotToMinutePointMapper {

    public BazaarItemHourPoint toMinute(BazaarItemSnapshot s, BazaarItemHourSummary hs) {
        // note: order lists copied shallowly; we don't need deep clones – JPA will persist them under new parent
        BazaarItemHourPoint hp = BazaarItemHourPoint.builder()
                .hourSummary(hs)
                .productId(s.getProductId())
                .snapshotTime(s.getFetchedAt())
                .apiLastUpdated(s.getLastUpdated())
                .instantBuyPrice (s.getInstantBuyPrice())
                .instantSellPrice(s.getInstantSellPrice())
                .weightedTwoPercentBuyPrice (s.getWeightedTwoPercentBuyPrice())
                .weightedTwoPercentSellPrice(s.getWeightedTwoPercentSellPrice())
                .buyMovingWeek (s.getBuyMovingWeek())
                .sellMovingWeek(s.getSellMovingWeek())
                .activeBuyOrdersCount (s.getActiveBuyOrdersCount())
                .activeSellOrdersCount(s.getActiveSellOrdersCount())
                .build();

        // copy order‑books
        s.getBuyOrders().forEach(o ->
                hp.getBuyOrders().add(
                        o.toBuilder()
                                .id(null)                  // make sure we build a NEW row
                                .snapshot(null)
                                .hourPoint(hp)           // ← now legal
                                .build()));

        s.getSellOrders().forEach(o ->
                hp.getSellOrders().add(
                        o.toBuilder()
                                .id(null)
                                .snapshot(null)
                                .hourPoint(hp)
                                .build()));

        return hp;
    }
}
