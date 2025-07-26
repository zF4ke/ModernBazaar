package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.BazaarItem;
import com.modernbazaar.core.dto.RawBazaarResponse;
import com.modernbazaar.core.dto.RawBazaarProduct;
import com.modernbazaar.core.domain.BazaarProductSnapshot;
import com.modernbazaar.core.repository.BazaarItemRepository;
import com.modernbazaar.core.repository.BazaarProductSnapshotRepository;
import com.modernbazaar.core.service.ingest.SnapshotIngestor;
import com.modernbazaar.core.util.BazaarSnapshotMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BazaarFetchService {

    private final WebClient webClient;
    private final BazaarSnapshotMapper mapper;
    private final SnapshotIngestor snapshotIngestor;
    private final BazaarProductSnapshotRepository snapshotRepo;
    private final BazaarItemRepository itemRepo;

    private final static String BAZAAR_API_URI = "/skyblock/bazaar";

    /**
     * Fetches the latest bazaar data from the API and stores it in the database.
     */
    public void fetchAndStore() {
        // 1) fetch raw
        RawBazaarResponse resp = webClient.get()
                .uri(BAZAAR_API_URI)
                .retrieve()
                .bodyToMono(RawBazaarResponse.class)
                .block();  // blocking here…

        if (resp == null || !resp.isSuccess()) {
            log.warn("Bazaar fetch failed or null");
            return;
        }

        Instant apiTs = Instant.ofEpochMilli(resp.getLastUpdated());

        // 2) upsert items
        List<BazaarItem> items = resp.getProducts().keySet().stream()
                .map(id -> BazaarItem.builder().productId(id).build())
                .distinct()
                .collect(Collectors.toList());
        itemRepo.saveAll(items);

        // 3) map & dedupe
        List<BazaarProductSnapshot> toSave = resp.getProducts().values().stream()
                .map(raw -> mapper.toSnapshot(raw, resp.getLastUpdated()))
                .filter(snap -> {
                    var existing = snapshotRepo
                            .findTopByProductIdOrderByLastUpdatedDesc(snap.getProductId());
                    return existing == null || !existing.getLastUpdated().equals(apiTs);
                })
                .collect(Collectors.toList());

        if (toSave.isEmpty()) {
            log.info("No changes detected; skipping persist");
            return;
        }

        // 4) bulk‑insert safely
        snapshotIngestor.bulkInsert(toSave);
        log.info("Persisted {} snapshots", toSave.size());
    }
}
