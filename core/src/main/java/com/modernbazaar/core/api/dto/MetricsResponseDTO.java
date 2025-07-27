package com.modernbazaar.core.api.dto;

import java.time.LocalDateTime;

/**
 * Response DTO for system metrics and performance data.
 */
public record MetricsResponseDTO(
        LocalDateTime lastFetch,
        int totalItems,
        double avgSpread,
        double heapUsage,
        String dbStatus
) {
} 