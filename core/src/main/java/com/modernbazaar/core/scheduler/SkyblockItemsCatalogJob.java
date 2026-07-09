package com.modernbazaar.core.scheduler;

import com.modernbazaar.core.service.SkyblockItemsCatalogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(prefix = "skyblock.catalog", name = "enabled", havingValue = "true")
public class SkyblockItemsCatalogJob {

    private final SkyblockItemsCatalogService service;

    @Value("${skyblock.catalog.refresh-days:30}")
    private int refreshDays;

    @EventListener(ApplicationReadyEvent.class)
    public void runOnStartup() {
        refreshIfStale("startup");
    }

    @Scheduled(cron = "${skyblock.catalog.cron:0 0 3 * * *}") // 03:00 daily by default
    public void run() {
        refreshIfStale("scheduled");
    }

    private void refreshIfStale(String trigger) {
        boolean refreshed = service.refreshIfStale(Duration.ofDays(refreshDays));
        if (refreshed) {
            log.info("Skyblock catalog refreshed by {} trigger (stale > {} days).", trigger, refreshDays);
        } else {
            log.info("Skyblock catalog still fresh for {} trigger; no refresh performed.", trigger);
        }
    }
}
