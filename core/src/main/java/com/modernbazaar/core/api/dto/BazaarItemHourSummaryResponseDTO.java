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
        long    createdBuyOrders,
        long    deltaBuyOrders,
        long    createdSellOrders,
        long    deltaSellOrders,
        long    addedItemsBuyOrders,
        long    addedItemsSellOrders,
        @Nullable List<BazaarItemHourPointDTO> points
) {
    public static BazaarItemHourSummaryResponseDTO of(
            BazaarItemHourSummary s, boolean withPoints) {

        List<BazaarItemHourPointDTO> pts = null;

        if (withPoints && s.getPoints() != null) {
            pts = s.getPoints().stream()
                    .sorted(Comparator.comparing(BazaarItemHourPoint::getSnapshotTime))
                    .map(p -> new BazaarItemHourPointDTO(
                            p.getSnapshotTime(),
                            p.getInstantBuyPrice(),
                            p.getInstantSellPrice(),
                            p.getActiveBuyOrdersCount(),
                            p.getActiveSellOrdersCount(),
                            p.getBuyVolume(),
                            p.getSellVolume(),
                            List.of(), // evitar carregar order books nos pontos
                            List.of()
                    ))
                    .toList();
        }

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
                s.getCreatedBuyOrders(),        s.getDeltaBuyOrders(),
                s.getCreatedSellOrders(),       s.getDeltaSellOrders(),
                s.getAddedItemsBuyOrders(),     s.getAddedItemsSellOrders(),
                pts
        );
    }
}