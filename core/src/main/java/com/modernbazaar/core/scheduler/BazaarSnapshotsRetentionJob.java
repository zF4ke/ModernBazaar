package com.modernbazaar.core.scheduler;

import com.modernbazaar.core.repository.BazaarProductSnapshotRepository;
import com.modernbazaar.core.repository.BazaarItemHourSummaryRepository;
import com.modernbazaar.core.repository.BazaarHourPointRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
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
     * Scheduled job to purge old Bazaar data (minute points, hour summaries, and snapshots).
     * Runs daily at 03:00 and deletes records older than the configured retention period.
     */
    @Scheduled(cron = "0 0 3 * * *") // runs daily at 03:00
    @Transactional
    public void purgeOld() {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        // 1) apagar minute points e suas order-books vinculadas às hour summaries antigas
        hourPointRepo.cascadeDeleteBySummaryHourStartBefore(cutoff);
        // 2) apagar hour summaries antigas
        hourSummaryRepo.deleteByHourStartBefore(cutoff);
        // 3) apagar snapshots antigos e suas order-books
        repo.cascadeDeleteByFetchedAtBefore(cutoff);

        log.info("Purged Bazaar data older than {} days", retentionDays);
    }
}