package com.modernbazaar.core.service;

import com.modernbazaar.core.dto.RawBazaarResponse;
import com.modernbazaar.core.dto.RawBazaarProduct;
import com.modernbazaar.core.domain.BazaarProductSnapshot;
import com.modernbazaar.core.repository.BazaarProductSnapshotRepository;
import com.modernbazaar.core.util.BazaarSnapshotMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Service
@RequiredArgsConstructor
@Slf4j
public class BazaarFetchService {

    private final WebClient webClient;
    private final BazaarSnapshotMapper mapper;
    private final BazaarProductSnapshotRepository repo;

    /**
     * Fetches the bazaar data and writes snapshots.
     * Only called by the scheduled job.
     */
    public void fetchAndStore() {
        webClient.get()
                .uri("/skyblock/bazaar")
                .retrieve()
                .bodyToMono(RawBazaarResponse.class)
                .flatMapMany(this::toProductFlux)
                .flatMap(this::persistSnapshot)
                .onErrorContinue((e, o) -> log.warn("Error saving snapshot: {}", e.toString()))
                .subscribe();
    }

    /**
     * Converts the raw bazaar response into a Flux of products with their API timestamp.
     *
     * @param resp the raw bazaar response containing products
     * @return a Flux of ProductWithTimestamp, each containing a product and its last updated timestamp
     */
    private Flux<ProductWithTimestamp> toProductFlux(RawBazaarResponse resp) {
        if (!resp.isSuccess()) {
            log.warn("Bazaar fetch returned success=false; skipping");
            return Flux.empty();
        }
        long lastUpdated = resp.getLastUpdated();
        return Flux.fromIterable(resp.getProducts().values())
                .map(raw -> new ProductWithTimestamp(raw, lastUpdated));
    }

    /**
     * Converts and saves a single product snapshot on a bounded‑elastic thread.
     *
     * @param pwt the product with its API timestamp
     * @return a Mono that completes when the snapshot is saved
     */
    private Mono<BazaarProductSnapshot> persistSnapshot(ProductWithTimestamp pwt) {
        return Mono.fromCallable(() -> {
                    RawBazaarProduct raw = pwt.product();
                    return repo.save(mapper.toSnapshot(raw, pwt.lastUpdated()));
                })
                .subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * Pairing of a raw product and its API timestamp.
     *
     * @param product the raw product data
     * @param lastUpdated the timestamp from the API response
     */
    private record ProductWithTimestamp(RawBazaarProduct product, long lastUpdated) {}
}