package com.modernbazaar.core.scheduler;

import com.modernbazaar.core.service.BazaarHourlyProcessingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
@ConditionalOnProperty(prefix = "skyblock.bazaar.processing.hourly", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class BazaarHourlyProcessingJob {

    private final BazaarHourlyProcessingService service;

    /** crude in‑JVM lock so two schedulers on the same node don’t collide */
    private static final Object LOCK = new Object();

    /** every 5 minutes, with a 2‑minute grace so the current hour is settled */
    @Scheduled(cron = "0 */5 * * * *")
    public void compactLoop() {
        synchronized (LOCK) {
            Instant oldest = service.findOldestSnapshotTimestamp();
            if (oldest == null) return;                       // nothing pending

            Instant hourStart = oldest.truncatedTo(ChronoUnit.HOURS);
            Instant hourEnd   = hourStart.plus(1, ChronoUnit.HOURS);

            // only proceed if the full hour has definitely finished
            if (Instant.now().isBefore(hourEnd.plusSeconds(120))) {   // 2 min grace
                return; // still collecting this hour → wait for next tick
            }

            try {
                service.processSingleHour(hourStart); // **one** hour
            } catch (Exception ex) {
                log.error("Compaction failed for {}", hourStart, ex);
            }
        }
    }
}
