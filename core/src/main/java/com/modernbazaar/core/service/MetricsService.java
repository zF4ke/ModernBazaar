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

    public MetricsResponseDTO getSystemMetrics() {
        Instant latest = snapshotRepository.findLatestFetchTime().orElse(null);
        LocalDateTime lastFetch = latest != null
                ? LocalDateTime.ofInstant(latest, ZoneId.systemDefault())
                : LocalDateTime.now().minusDays(1);

        int totalItems = snapshotRepository.countDistinctProducts();
        double avgSpread = snapshotRepository.calculateAverageSpread();
        double heapUsage = getHeapUsagePercentage();
        String dbStatus = checkDatabaseHealth() ? "Healthy" : "Unhealthy";

        return new MetricsResponseDTO(
                lastFetch,
                totalItems,
                avgSpread,
                heapUsage,
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