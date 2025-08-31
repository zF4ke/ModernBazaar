package com.modernbazaar.core.service;

import com.modernbazaar.core.api.dto.MetricsResponseDTO;
import com.modernbazaar.core.repository.BazaarProductSnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class MetricsService {

    private final BazaarProductSnapshotRepository snapshotRepository;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Returns basic system metrics suitable for free users.
     * Limited information to avoid exposing too much data to unauthenticated users.
     */
    public MetricsResponseDTO getSystemMetrics() {
        Instant latest = snapshotRepository.findLatestFetchTime().orElse(null);
        LocalDateTime lastFetch = latest != null
                ? LocalDateTime.ofInstant(latest, ZoneId.systemDefault())
                : LocalDateTime.now().minusDays(1);

        String dbStatus = checkDatabaseHealth() ? "Healthy" : "Unhealthy";
        
        // Limited metrics for free users - only basic information
        int totalItems = snapshotRepository.countDistinctProducts();
        
        // Cap values to prevent exposing exact profitable item counts
        // Show general ranges instead of exact numbers
        Integer profitableItemsResult = snapshotRepository.countProfitableItems();
        int actualProfitableItems = profitableItemsResult != null ? profitableItemsResult : 0;
        
        // Round profitable items to nearest 50 to avoid exposing exact counts
        int profitableItems = Math.round(actualProfitableItems / 50.0f) * 50;
        
        // Provide general activity score without revealing exact profit margins
        double profitableRatio = totalItems > 0 ? (double) actualProfitableItems / totalItems : 0.0;
        double freshnessScore = latest != null ? Math.min(1.0, (double) java.time.Duration.between(latest, Instant.now()).toHours() / 24.0) : 0.0;
        double marketActivityScore = (profitableRatio * 0.7 + (1.0 - freshnessScore) * 0.3) * 100.0;

        // allowed to even for free users
        double avgProfitMargin = snapshotRepository.findAverageProfitMargin().orElse(0.0);

        return new MetricsResponseDTO(
                lastFetch,
                totalItems,
                profitableItems,
                avgProfitMargin,
                marketActivityScore,
                dbStatus
        );
    }

    /**
     * Calculates the percentage of heap memory currently in use.
     *
     * @return the percentage of heap memory used, or 0.0 if max heap size is unknown
     */
    private double getHeapUsagePercentage() {
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        long heapUsed = memoryBean.getHeapMemoryUsage().getUsed();
        long heapMax = memoryBean.getHeapMemoryUsage().getMax();
        
        if (heapMax == -1) {
            return 0.0; // Unable to determine max heap
        }
        
        return (double) heapUsed / heapMax * 100.0;
    }

    /**
     * Checks the health of the database connection by executing a simple query.
     *
     * @return true if the database is healthy, false otherwise
     */
    private boolean checkDatabaseHealth() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return true;
        } catch (DataAccessException e) {
            return false;
        }
    }
} 