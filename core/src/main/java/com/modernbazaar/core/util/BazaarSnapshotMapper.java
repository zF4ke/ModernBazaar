package com.modernbazaar.core.util;

import com.modernbazaar.core.domain.BazaarProductSnapshot;
import com.modernbazaar.core.domain.BuyOrderEntry;
import com.modernbazaar.core.domain.SellOrderEntry;
import com.modernbazaar.core.dto.RawBazaarProduct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class BazaarSnapshotMapper {

    /**
     * Converts a RawBazaarProduct into a BazaarProductSnapshot,
     * mapping the two summary lists into their own entries and
     * pulling out quick‐status fields directly.
     *
     * @param raw the raw bazaar product data
     * @param apiLastUpdated the last‑updated timestamp from the API (ms since epoch)
     * @return a fully populated BazaarProductSnapshot
     */
    public BazaarProductSnapshot toSnapshot(RawBazaarProduct raw, long apiLastUpdated) {
        // 1) build the snapshot core
        BazaarProductSnapshot snapshot = BazaarProductSnapshot.builder()
                .productId(raw.getProductId())
                .lastUpdated(Instant.ofEpochMilli(apiLastUpdated))
                .fetchedAt(Instant.now())

                // quickStatus → primitives
                .weightedTwoPercentSellPrice(raw.getQuickStatus().getSellPrice())
                .sellMovingWeek(raw.getQuickStatus().getSellMovingWeek())
                .activeSellOrdersCount(raw.getQuickStatus().getSellOrders())

                .weightedTwoPercentBuyPrice(raw.getQuickStatus().getBuyPrice())
                .buyMovingWeek(raw.getQuickStatus().getBuyMovingWeek())
                .activeBuyOrdersCount(raw.getQuickStatus().getBuyOrders())
                .build();

        // 2) map raw.sell_summary → SellOrderEntry list
        raw.getSell_summary().forEach(rawEntry -> {
            SellOrderEntry e = SellOrderEntry.builder()
                    .snapshot(snapshot)
                    .pricePerUnit(rawEntry.getPricePerUnit())
                    .amount(rawEntry.getAmount())
                    .orders(rawEntry.getOrders())
                    .build();
            snapshot.getSellOrders().add(e);
        });

        // 3) map raw.buy_summary → BuyOrderEntry list
        raw.getBuy_summary().forEach(rawEntry -> {
            BuyOrderEntry e = BuyOrderEntry.builder()
                    .snapshot(snapshot)
                    .pricePerUnit(rawEntry.getPricePerUnit())
                    .amount(rawEntry.getAmount())
                    .orders(rawEntry.getOrders())
                    .build();
            snapshot.getBuyOrders().add(e);
        });

        return snapshot;
    }
}