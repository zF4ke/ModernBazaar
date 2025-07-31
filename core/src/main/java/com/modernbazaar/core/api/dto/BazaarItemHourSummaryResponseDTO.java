package com.modernbazaar.core.api.dto;

import com.modernbazaar.core.domain.BazaarItemHourPoint;
import com.modernbazaar.core.domain.BazaarItemHourSummary;
import jakarta.annotation.Nullable;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

public record BazaarItemHourSummaryResponseDTO(
        String  productId,
        @Nullable String displayName,
        Instant hourStart,
        double  openInstantBuyPrice,
        double  closeInstantBuyPrice,
        double  minInstantBuyPrice,
        double  maxInstantBuyPrice,
        double  openInstantSellPrice,
        double  closeInstantSellPrice,
        double  minInstantSellPrice,
        double  maxInstantSellPrice,
        long    newSellOrders,
        long    deltaNewSellOrders,
        long    newBuyOrders,
        long    deltaNewBuyOrders,
        long    itemsListedSellOrders,
        long    itemsListedBuyOrders,
        @Nullable List<BazaarItemHourPointDTO> points
) {
    public static BazaarItemHourSummaryResponseDTO of(
            BazaarItemHourSummary s, boolean withPoints) {


        List<BazaarItemHourPointDTO> pts = (withPoints && s.getPoints() != null)
                ? s.getPoints().stream()
                .sorted(Comparator.comparing(BazaarItemHourPoint::getSnapshotTime))
                .map(BazaarItemHourPointDTO::of)
                .toList()
                : List.of();

        String name = (s.getItem() != null &&
                s.getItem().getSkyblockItem() != null)
                ? s.getItem().getSkyblockItem().getName()
                : null;

        return new BazaarItemHourSummaryResponseDTO(
                s.getProductId(),               name,
                s.getHourStart(),
                s.getOpenInstantBuyPrice(),     s.getCloseInstantBuyPrice(),
                s.getMinInstantBuyPrice(),      s.getMaxInstantBuyPrice(),
                s.getOpenInstantSellPrice(),    s.getCloseInstantSellPrice(),
                s.getMinInstantSellPrice(),     s.getMaxInstantSellPrice(),
                s.getNewSellOrders(),           s.getDeltaNewSellOrders(),
                s.getNewBuyOrders(),            s.getDeltaNewBuyOrders(),
                s.getItemsListedSellOrders(),   s.getItemsListedBuyOrders(),
                pts
        );
    }
}