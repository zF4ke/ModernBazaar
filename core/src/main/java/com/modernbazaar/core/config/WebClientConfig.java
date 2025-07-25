package com.modernbazaar.core.config;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.util.retry.Retry;

import java.time.Duration;

@Configuration
public class WebClientConfig {
    private static final String HYPIXEL_BASE_URL     = "https://api.hypixel.net/v2";
    private static final int    MAX_IN_MEMORY_BYTES  = 8 * 1_024 * 1_024; // 8 MB
    private static final int    RETRY_ATTEMPTS       = 3;
    private static final Duration RETRY_MIN_BACKOFF  = Duration.ofSeconds(2);

    /**
     * Configures a WebClient for accessing the Hypixel API.
     * The WebClient is set up with a base URL, custom exchange strategies,
     * and retry logic for handling transient errors.
     *
     * @param registry MeterRegistry for monitoring metrics.
     * @return Configured WebClient instance.
     */
    @Bean
    public WebClient hypixelWebClient(MeterRegistry registry) {
        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector())
                .baseUrl(HYPIXEL_BASE_URL)
                .exchangeStrategies(exchangeStrategies())
                .filter((req, next) -> next.exchange(req)
                        .retryWhen(Retry.backoff(RETRY_ATTEMPTS, RETRY_MIN_BACKOFF)))
                .build();
    }

    /**
     * Configures the exchange strategies for the WebClient.
     * Increases the in-memory buffer size to handle larger JSON responses.
     *
     * @return ExchangeStrategies with increased max in-memory size.
     */
    private ExchangeStrategies exchangeStrategies() {
        return ExchangeStrategies.builder()
                // Increase the in‑memory buffer for responses up to MAX_IN_MEMORY_BYTES.
                // Default is only 256 KB, which may overflow on the large JSON bazaar payload.
                .codecs(configurer ->
                        configurer.defaultCodecs().maxInMemorySize(MAX_IN_MEMORY_BYTES))
                .build();
    }
}
