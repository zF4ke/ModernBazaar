package com.modernbazaar.core.api.dto;

import jakarta.annotation.Nullable;

import java.time.Instant;

public record BazaarItemHourAverageResponseDTO(
        String productId,
        @Nullable String displayName,
        Instant calculatedAt,
        int summaryCount,
        double averageOpenInstantBuyPrice,
        double averageCloseInstantBuyPrice,
        double averageMinInstantBuyPrice,
        double averageMaxInstantBuyPrice,
        double averageOpenInstantSellPrice,
        double averageCloseInstantSellPrice,
        double averageMinInstantSellPrice,
        double averageMaxInstantSellPrice,
        double averageCreatedBuyOrders,
        double averageDeltaBuyOrders,
        double averageCreatedSellOrders,
        double averageDeltaSellOrders,
        double averageAddedItemsBuyOrders,
        double averageAddedItemsSellOrders
) {
    public static BazaarItemHourAverageResponseDTO of(
            String productId,
            @Nullable String displayName,
            Instant calculatedAt,
            int summaryCount,
            double avgOpenBuy, double avgCloseBuy, double avgMinBuy, double avgMaxBuy,
            double avgOpenSell, double avgCloseSell, double avgMinSell, double avgMaxSell,
            double avgCreatedBuy, double avgDeltaBuy,
            double avgCreatedSell, double avgDeltaSell,
            double avgAddedBuy, double avgAddedSell) {
        return new BazaarItemHourAverageResponseDTO(
                productId, displayName, calculatedAt, summaryCount,
                avgOpenBuy, avgCloseBuy, avgMinBuy, avgMaxBuy,
                avgOpenSell, avgCloseSell, avgMinSell, avgMaxSell,
                avgCreatedBuy, avgDeltaBuy, avgCreatedSell, avgDeltaSell,
                avgAddedBuy, avgAddedSell);
    }
} 