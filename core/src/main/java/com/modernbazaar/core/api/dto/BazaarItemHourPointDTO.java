package com.modernbazaar.core.api.dto;

import com.modernbazaar.core.domain.BazaarItemHourPoint;
import com.modernbazaar.core.domain.BuyOrderEntry;
import com.modernbazaar.core.domain.SellOrderEntry;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

/**
 * Thin, immutable view of a single kept minute-point inside an hour bucket.
 * Includes the *entire* depth lists so callers can rebuild an order-book.
 */
public record BazaarItemHourPointDTO(
        Instant snapshotTime,
        double  instantBuyPrice,
        double  instantSellPrice,
        int     activeBuyOrdersCount,
        int     activeSellOrdersCount,
        List<OrderEntryResponseDTO> buyOrders,
        List<OrderEntryResponseDTO> sellOrders
) {}