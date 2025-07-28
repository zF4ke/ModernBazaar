package com.modernbazaar.core.scheduler;

import com.modernbazaar.core.service.BazaarItemsFetchService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "bazaar.poll", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
public class BazaarItemsPollJob {

    private final BazaarItemsFetchService fetchService;

    /**
     * Triggers the fetch once every configured interval.
     * Interval is defined by bazaar.poll.interval-seconds in application.yml.
     */
    @Scheduled(fixedDelayString = "${bazaar.poll.interval-seconds:60}000")
    public void run() {
        fetchService.fetchAndStore();
    }
}
