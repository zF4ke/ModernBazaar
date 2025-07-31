package com.modernbazaar.core.api.dto;

import com.modernbazaar.core.domain.BazaarItemHourPoint;
import com.modernbazaar.core.domain.BazaarItemHourSummary;
import com.modernbazaar.core.domain.BuyOrderEntry;
import com.modernbazaar.core.domain.SellOrderEntry;
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
                            /* buy side */
                            p.getBuyOrders().stream()
                                    .sorted(Comparator.comparingInt(BuyOrderEntry::getOrderIndex))
                                    .map(o -> new OrderEntryResponseDTO(
                                            o.getOrderIndex(), o.getPricePerUnit(),
                                            o.getAmount(),     o.getOrders()))
                                    .toList(),
                            /* sell side */
                            p.getSellOrders().stream()
                                    .sorted(Comparator.comparingInt(SellOrderEntry::getOrderIndex))
                                    .map(o -> new OrderEntryResponseDTO(
                                            o.getOrderIndex(), o.getPricePerUnit(),
                                            o.getAmount(),     o.getOrders()))
                                    .toList()
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
                s.getNewSellOrders(),           s.getDeltaNewSellOrders(),
                s.getNewBuyOrders(),            s.getDeltaNewBuyOrders(),
                s.getItemsListedSellOrders(),   s.getItemsListedBuyOrders(),
                pts
        );
    }
}