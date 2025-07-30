package com.modernbazaar.core.api.dto;

import java.time.Instant;

public record BazaarItemSummaryResponseDTO(
        String productId,
        String displayName,
        Instant lastUpdated,
        Instant fetchedAt,
        double weightedTwoPercentBuyPrice,     // weightedTwoPercentBuyPrice
        double weightedTwoPercentSellPrice,    // weightedTwoPercentSellPrice
        double instantBuyPrice,          // instantBuyPrice
        double instantSellPrice,         // instantSellPrice
        double spread,       // sell - buy
        long buyMovingWeek,
        long sellMovingWeek,
        int activeBuyOrdersCount,
        int activeSellOrdersCount
) {}
