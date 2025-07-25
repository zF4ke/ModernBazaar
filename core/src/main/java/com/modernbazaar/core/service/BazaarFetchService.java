package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.BazaarItem;
import com.modernbazaar.core.dto.RawBazaarResponse;
import com.modernbazaar.core.dto.RawBazaarProduct;
import com.modernbazaar.core.domain.BazaarProductSnapshot;
import com.modernbazaar.core.repository.BazaarItemRepository;
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

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class BazaarFetchService {

    private final WebClient webClient;
    private final BazaarSnapshotMapper mapper;
    private final BazaarProductSnapshotRepository snapshotRepo;
    private final BazaarItemRepository itemRepo;

    private final static String BAZAAR_API_URI = "/skyblock/bazaar";

    /**
     * Fetches the latest bazaar data from the API and stores it in the database.
     */
    public void fetchAndStore() {
        webClient.get()
                .uri(BAZAAR_API_URI)
                .retrieve()
                .bodyToMono(RawBazaarResponse.class)
                // 1) upsert all items, then pass the response along
                .flatMap(this::upsertItems)
                // 2) convert into a stream of product + timestamp
                .flatMapMany(this::toProductFlux)
                // 3) persist each snapshot
                .flatMap(this::persistSnapshot)
                .onErrorContinue((e, o) -> log.warn("Error saving snapshot: {}", e.toString()))
                .subscribe();
    }

    /**
     * Upserts items into the BazaarItemRepository based on the product IDs
     * from the RawBazaarResponse.
     *
     * @param resp the raw bazaar response containing product IDs
     * @return a Mono containing the original response after upserting items
     */
    private Mono<RawBazaarResponse> upsertItems(RawBazaarResponse resp) {
        if (!resp.isSuccess()) {
            log.warn("Bazaar fetch returned success=false; skipping upsert");
            return Mono.just(resp);
        }

        return Flux.fromIterable(resp.getProducts().keySet())
                .distinct()
                .map(id -> BazaarItem.builder()
                        .productId(id)
                        // .displayName(deriveFrom(id))
                        .build())
                .collectList()
                // wrap the blocking saveAll in a Callable
                .flatMap(list ->
                        Mono.fromCallable(() -> itemRepo.saveAll(list))
                                .subscribeOn(Schedulers.boundedElastic())
                )
                .thenReturn(resp);
    }

    /**
     * Converts the RawBazaarResponse into a Flux of ProductWithTimestamp.
     * Each product is paired with the last updated timestamp from the API.
     *
     * @param resp the raw bazaar response containing product data
     * @return a Flux of ProductWithTimestamp, each containing a product and its last updated timestamp
     */
    private Flux<ProductWithTimestamp> toProductFlux(RawBazaarResponse resp) {
        long lastUpdated = resp.getLastUpdated();
        return Flux.fromIterable(resp.getProducts().values())
                .map(raw -> new ProductWithTimestamp(raw, lastUpdated));
    }

    /**
     * Checks if the given product’s lastUpdated in the DB differs
     * from the API timestamp.
     *
     * @param productId the product ID to check
     * @param apiTs the last updated timestamp from the API
     * @return a Mono that emits true if the product has changed, false otherwise
     */
    private Mono<Boolean> hasChanged(String productId, Instant apiTs) {
        return Mono.fromCallable(() -> {
                    BazaarProductSnapshot existing =
                            snapshotRepo.findTopByProductIdOrderByLastUpdatedDesc(productId);
                    if (existing == null) return true;
                    return !existing.getLastUpdated().equals(apiTs);
                })
                .subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * Converts a ProductWithTimestamp into a BazaarProductSnapshot and persists it.
     * Uses the mapper to serialize the product data into JSON.
     *
     * @param pwt the product with its last updated timestamp
     * @return a Mono that completes when the snapshot is saved
     */
    private Mono<BazaarProductSnapshot> persistSnapshot(ProductWithTimestamp pwt) {
        Instant apiTs = Instant.ofEpochMilli(pwt.lastUpdated());
        String productId = pwt.product().getProductId();

        return hasChanged(productId, apiTs)
                .flatMap(changed -> {
                    if (!changed) {
                        // nothing new; skip
                        return Mono.empty();
                    }
                    return Mono.fromCallable(() ->
                                snapshotRepo.save(mapper.toSnapshot(pwt.product(), pwt.lastUpdated()))
                        )
                        .subscribeOn(Schedulers.boundedElastic());
                });
    }

    private record ProductWithTimestamp(RawBazaarProduct product, long lastUpdated) {}
}
