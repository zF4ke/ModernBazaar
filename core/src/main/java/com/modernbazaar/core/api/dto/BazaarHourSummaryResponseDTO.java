package com.modernbazaar.core.api.dto;

import com.modernbazaar.core.domain.BazaarItemHourPoint;
import com.modernbazaar.core.domain.BazaarItemHourSummary;
import jakarta.annotation.Nullable;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

public record BazaarHourSummaryResponseDTO(
        Instant hourStart,
        double openInstantBuyPrice,
        double closeInstantBuyPrice,
        double minInstantBuyPrice,
        double maxInstantBuyPrice,
        double openInstantSellPrice,
        double closeInstantSellPrice,
        double minInstantSellPrice,
        double maxInstantSellPrice,
        long   newSellOrders,
        long   deltaNewSellOrders,
        long   newBuyOrders,
        long   deltaNewBuyOrders,
        long   itemsListedSellOrders,
        long   itemsListedBuyOrders,
        @Nullable List<BazaarHourPointDTO> points   // null unless withPoints=true
) {
    public static BazaarHourSummaryResponseDTO of(BazaarItemHourSummary s,
                                                  boolean includePoints) {
        List<BazaarHourPointDTO> pts = null;
        if (includePoints && s.getPoints() != null) {
            pts = s.getPoints().stream()
                    .sorted(Comparator.comparing(BazaarItemHourPoint::getSnapshotTime))
                    .map(p -> new BazaarHourPointDTO(
                            p.getSnapshotTime(),
                            p.getInstantBuyPrice(),
                            p.getInstantSellPrice(),
                            p.getActiveBuyOrdersCount(),
                            p.getActiveSellOrdersCount()))
                    .toList();
        }
        return new BazaarHourSummaryResponseDTO(
                s.getHourStart(),
                s.getOpenInstantBuyPrice(),
                s.getCloseInstantBuyPrice(),
                s.getMinInstantBuyPrice(),
                s.getMaxInstantBuyPrice(),
                s.getOpenInstantSellPrice(),
                s.getCloseInstantSellPrice(),
                s.getMinInstantSellPrice(),
                s.getMaxInstantSellPrice(),
                s.getNewSellOrders(),
                s.getDeltaNewSellOrders(),
                s.getNewBuyOrders(),
                s.getDeltaNewBuyOrders(),
                s.getItemsListedSellOrders(),
                s.getItemsListedBuyOrders(),
                pts
        );
    }
}

