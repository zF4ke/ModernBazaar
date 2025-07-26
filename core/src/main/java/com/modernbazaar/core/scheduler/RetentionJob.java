package com.modernbazaar.core.scheduler;

import com.modernbazaar.core.repository.BazaarProductSnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
@ConditionalOnProperty(prefix = "bazaar.retention", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
public class RetentionJob {

    private final BazaarProductSnapshotRepository repo;

    @Value("${bazaar.retention.interval-hours:48}")
    private long retentionHours;

    /**
     * Scheduled job to purge old Bazaar product snapshots.
     * This job runs daily at 03:00 and deletes snapshots older than the configured retention period.
     */
    @Scheduled(cron = "0 0 3 * * *") // runs daily at 03:00
    public void purgeOld() {
        Instant cutoff = Instant.now().minus(retentionHours, ChronoUnit.HOURS);
        repo.deleteByFetchedAtBefore(cutoff);
    }
}