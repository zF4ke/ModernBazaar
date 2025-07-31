package com.modernbazaar.core.api.dto;

/**
 * Wrapper that carries the freshest minute-snapshot plus the last completed
 * hour bar.  Either side may be {@code null} when data is still back-filling.
 */
public record BazaarItemLiveViewResponseDTO(
        BazaarItemSnapshotResponseDTO      snapshot,
        BazaarItemHourSummaryResponseDTO   lastHourSummary
) {}
