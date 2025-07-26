package com.modernbazaar.core.api.dto;

public record OrderEntryResponseDTO (
        int orderIndex,
        double pricePerUnit,
        long amount,
        int orders
) {}
