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
    private static final Object LOCK = new Object();

    /**
     * Runs every 5 minutes, with a 2-minute grace: picks the oldest snapshot as window start
     */
    @Scheduled(cron = "0 */5 * * * *")
    public void compactLoop() {
        synchronized (LOCK) {
            Instant oldest = service.findOldestSnapshotTimestamp();
            if (oldest == null) return;

            Duration duration = Duration.between(oldest, Instant.now());
            long hours = duration.toHours();
            long minutes = duration.minusHours(hours).toMinutes();
            log.info("Compacting bazaar hourly data for {}h{} min ago", hours, minutes);

            Instant windowStart = oldest;
            Instant windowEnd   = windowStart.plus(1, ChronoUnit.HOURS);

            // wait until we have a full hour of data (plus 2 min grace)
            if (Instant.now().isBefore(windowEnd.plusSeconds(120))) {
                return;
            }

            try {
                service.processSingleHour(windowStart);
            } catch (Exception ex) {
                log.error("Compaction failed for {}", windowStart, ex);
            }
        }
    }
}
