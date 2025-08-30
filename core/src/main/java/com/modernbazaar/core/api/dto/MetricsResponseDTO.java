package com.modernbazaar.core.api.dto;

import java.time.LocalDateTime;

/**
 * Response DTO for system metrics and performance data.
 * Note: Heap usage is intentionally excluded from public metrics
 * as it contains sensitive infrastructure information.
 */
public record MetricsResponseDTO(
        LocalDateTime lastFetch,
        int totalItems,
        int profitableItems,
        double avgProfitMargin,
        double marketActivityScore,
        String dbStatus
) {
} 