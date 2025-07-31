package com.modernbazaar.core.api.dto;

import java.time.Instant;

public record BazaarHourPointDTO(
        Instant snapshotTime,
        double instantBuyPrice,
        double instantSellPrice,
        int    activeBuyOrders,
        int    activeSellOrders
) {}
