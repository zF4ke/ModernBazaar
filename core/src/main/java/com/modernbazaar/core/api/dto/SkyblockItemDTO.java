package com.modernbazaar.core.api.dto;

import java.time.Instant;

public record SkyblockItemDTO(
        String id,
        String name,
        String material,
        String color,
        String category,
        String tier,
        Double npcSellPrice,
        String statsJson,
        Instant lastRefreshed
) {}
