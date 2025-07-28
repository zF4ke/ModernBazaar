package com.modernbazaar.core.scheduler;

import com.modernbazaar.core.service.SkyblockItemsCatalogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(prefix = "skyblock.catalog", name = "enabled", havingValue = "true")
public class SkyblockItemsCatalogJob {

    private final SkyblockItemsCatalogService service;

    @Scheduled(cron = "${skyblock.catalog.cron:0 0 3 * * *}") // 03:00 daily by default
    public void run() {
        int days = Integer.getInteger("skyblock.catalog.refreshDays", 30);
        boolean refreshed = service.refreshIfStale(Duration.ofDays(days));
        if (refreshed) {
            log.info("Skyblock catalog refreshed (stale > {} days).", days);
        } else {
            log.info("Skyblock catalog still fresh; no refresh performed.");
        }
    }
}
