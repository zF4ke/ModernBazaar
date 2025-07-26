package com.modernbazaar.core.api.dto;

import java.time.Instant;

public record ItemSummaryResponseDTO (
        String productId,
        String displayName,
        Instant lastUpdated,
        Instant fetchedAt,
        double buyPrice,     // weightedTwoPercentBuyPrice
        double sellPrice,    // weightedTwoPercentSellPrice
        double spread,       // sell - buy
        long buyMovingWeek,
        long sellMovingWeek,
        int activeBuyOrdersCount,
        int activeSellOrdersCount
) {}
