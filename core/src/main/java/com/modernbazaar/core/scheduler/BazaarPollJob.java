package com.modernbazaar.core.scheduler;

import com.modernbazaar.core.service.BazaarFetchService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BazaarPollJob {

    private final BazaarFetchService fetchService;

    /**
     * Triggers the fetch once every configured interval.
     * Interval is defined by bazaar.poll.interval-ms in application.yml.
     */
    @Scheduled(fixedDelayString = "${bazaar.poll.interval-ms:2000}")
    public void run() {
        fetchService.fetchAndStore();
    }
}
