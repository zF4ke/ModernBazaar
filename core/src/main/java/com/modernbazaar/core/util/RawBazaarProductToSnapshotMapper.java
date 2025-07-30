package com.modernbazaar.core.util;

import com.modernbazaar.core.domain.BazaarItemSnapshot;
import com.modernbazaar.core.domain.BuyOrderEntry;
import com.modernbazaar.core.domain.SellOrderEntry;
import com.modernbazaar.core.dto.RawBazaarProduct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
public class RawBazaarProductToSnapshotMapper {

    /**
     * Converts a RawBazaarProduct into a BazaarProductSnapshot,
     * mapping the two summary lists into their own entries and
     * pulling out quick‐status fields directly.
     *
     * @param raw the raw bazaar product data
     * @param apiLastUpdated the last‑updated timestamp from the API (ms since epoch)
     * @return a fully populated BazaarProductSnapshot
     */
    public BazaarItemSnapshot toSnapshot(RawBazaarProduct raw, long apiLastUpdated) {
        List<RawBazaarProduct.OrderEntry> buySummary = raw.getBuy_summary(); // sell orders
        List<RawBazaarProduct.OrderEntry> sellSummary = raw.getSell_summary(); // buy orders

        // get highest buy order price
        double instantSellPrice = sellSummary != null && !sellSummary.isEmpty()
                ? sellSummary.getFirst().getPricePerUnit() : 0.0;

        // get highest sell order price
        double instantBuyPrice = buySummary != null && !buySummary.isEmpty()
                ? buySummary.getFirst().getPricePerUnit() : 0.0;

        // 1) build the snapshot core
        BazaarItemSnapshot snapshot = BazaarItemSnapshot.builder()
                .productId(raw.getProductId())
                .lastUpdated(Instant.ofEpochMilli(apiLastUpdated))
                .fetchedAt(Instant.now())
                .instantSellPrice(instantSellPrice)
                .weightedTwoPercentSellPrice(raw.getQuickStatus().getSellPrice())
                .sellMovingWeek(raw.getQuickStatus().getSellMovingWeek())
                .activeSellOrdersCount(raw.getQuickStatus().getSellOrders())
                .instantBuyPrice(instantBuyPrice)
                .weightedTwoPercentBuyPrice(raw.getQuickStatus().getBuyPrice())
                .buyMovingWeek(raw.getQuickStatus().getBuyMovingWeek())
                .activeBuyOrdersCount(raw.getQuickStatus().getBuyOrders())
                .buyVolume(raw.getQuickStatus().getBuyVolume())
                .sellVolume(raw.getQuickStatus().getSellVolume())
                .build();

        // sell_summary (sellers) -> BUY orders
        if (sellSummary != null) {
            int idx = 0;
            for (RawBazaarProduct.OrderEntry re : sellSummary) {
                BuyOrderEntry e = BuyOrderEntry.builder()
                        .snapshot(snapshot)
                        .orderIndex(idx++)
                        .pricePerUnit(re.getPricePerUnit())
                        .amount(re.getAmount())
                        .orders(re.getOrders())
                        .build();
                snapshot.getBuyOrders().add(e);
            }
        }

        // buy_summary (buyers) -> SELL orders
        if (buySummary != null) {
            int idx = 0;
            for (RawBazaarProduct.OrderEntry re : buySummary) {
                SellOrderEntry e = SellOrderEntry.builder()
                        .snapshot(snapshot)
                        .orderIndex(idx++)
                        .pricePerUnit(re.getPricePerUnit())
                        .amount(re.getAmount())
                        .orders(re.getOrders())
                        .build();
                snapshot.getSellOrders().add(e);
            }
        }

        return snapshot;
    }
}