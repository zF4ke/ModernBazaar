package com.modernbazaar.core.api.dto;

import java.time.Instant;
import java.util.List;

public record ItemDetailResponseDTO (
        String productId,
        String displayName,
        Instant lastUpdated,
        Instant fetchedAt,
        double buyPrice,
        double sellPrice,
        double spread,
        long buyMovingWeek,
        long sellMovingWeek,
        int activeBuyOrdersCount,
        int activeSellOrdersCount,
        List<OrderEntryResponseDTO> buyOrders,
        List<OrderEntryResponseDTO> sellOrders
) {}
