package com.modernbazaar.core.scheduler;

import com.modernbazaar.core.repository.BazaarProductSnapshotRepository;
import com.modernbazaar.core.repository.BazaarItemHourSummaryRepository;
import com.modernbazaar.core.repository.BazaarHourPointRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Slf4j
@Component
@ConditionalOnProperty(prefix = "skyblock.bazaar.retention", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
public class BazaarSnapshotsRetentionJob {

    private final BazaarProductSnapshotRepository repo;
    private final BazaarItemHourSummaryRepository hourSummaryRepo;
    private final BazaarHourPointRepository hourPointRepo;

    @Value("${skyblock.bazaar.retention.interval-days:45}")
    private long retentionDays;

    /**
     * Runs on application startup to purge old data immediately
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        log.info("Application started, running initial Bazaar data retention cleanup...");
        purgeOld();
    }

    /**
     * Scheduled job to purge old Bazaar data (minute points, hour summaries, and snapshots).
     * Runs daily at 03:00 and deletes records older than the configured retention period.
     */
    @Scheduled(cron = "0 0 3 * * *") // runs daily at 03:00
    @Transactional
    public void purgeOld() {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        
        // Quick count of records to be deleted (single query per table)
        long snapshotsToDelete = repo.countByFetchedAtBefore(cutoff);
        long hourSummariesToDelete = hourSummaryRepo.countByHourStartBefore(cutoff);
        long hourPointsToDelete = hourPointRepo.countBySummaryHourStartBefore(cutoff);
        
        log.info("Starting cleanup: {} snapshots, {} hour summaries, {} hour points to delete", 
                snapshotsToDelete, hourSummariesToDelete, hourPointsToDelete);
        
        // Execute deletions
        hourPointRepo.cascadeDeleteBySummaryHourStartBefore(cutoff);
        hourSummaryRepo.deleteByHourStartBefore(cutoff);
        repo.cascadeDeleteByFetchedAtBefore(cutoff);
        
        log.info("Purged Bazaar data older than {} days - Deleted {} records", 
                retentionDays, snapshotsToDelete + hourSummariesToDelete + hourPointsToDelete);
    }
}