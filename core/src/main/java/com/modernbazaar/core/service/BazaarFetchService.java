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
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;
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
    private static final int INGEST_BATCH = 50;

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

        // Upsert items
        Set<String> productIds = resp.getProducts().keySet();
        List<BazaarItem> items = productIds.stream()
                .distinct()
                .map(id -> BazaarItem.builder().productId(id).build())
                .collect(Collectors.toList());
        itemRepo.saveAll(items);

        // Map → dedupe → insert in small batches
        List<BazaarProductSnapshot> batch = new ArrayList<>(INGEST_BATCH);
        Collection<RawBazaarProduct> products = resp.getProducts().values();

        for (RawBazaarProduct raw : products) {
            BazaarProductSnapshot snap = mapper.toSnapshot(raw, resp.getLastUpdated());

            BazaarProductSnapshot existing =
                    snapshotRepo.findTopByProductIdOrderByLastUpdatedDesc(snap.getProductId());
            boolean changed = existing == null || !apiTs.equals(existing.getLastUpdated());
            if (!changed) {
                continue;
            }

            batch.add(snap);
            if (batch.size() >= INGEST_BATCH) {
                snapshotIngestor.bulkInsert(batch);
                batch.clear(); // release memory
            }
        }

        if (!batch.isEmpty()) {
            snapshotIngestor.bulkInsert(batch);
            batch.clear();
        }

        log.info("Persisted snapshots in batches; lastUpdated={}, products={}", apiTs, products.size());
    }
}
