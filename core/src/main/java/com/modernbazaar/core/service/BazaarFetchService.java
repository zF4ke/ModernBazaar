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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Instant;
import java.util.*;
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
    private static final int BATCH = 20;

    @PersistenceContext
    private EntityManager em;

    /** Entry point called by the scheduler. One TX, small batches, clear PC. */
    @Transactional
    public void fetchAndStore() {
        RawBazaarResponse resp = fetchBazaar();
        if (resp == null || !resp.isSuccess()) {
            //log.warn("Bazaar fetch failed or null");
            return;
        }

        Instant apiTs = Instant.ofEpochMilli(resp.getLastUpdated());
        //log.info("Poll start: products={}", resp.getProducts().size());

        upsertNewItems(resp);
        ingestNewSnapshots(resp, apiTs);

        //log.info("Poll end.");
    }

    /** Calls Hypixel and maps the JSON payload. */
    private RawBazaarResponse fetchBazaar() {
        return webClient.get()
                .uri(BAZAAR_API_URI)
                .retrieve()
                .bodyToMono(RawBazaarResponse.class)
                .block();
    }

    /** Insert new product IDs without merging existing rows. */
    private void upsertNewItems(RawBazaarResponse resp) {
        for (String id : resp.getProducts().keySet()) {
            itemRepo.insertIgnore(id);
        }
    }

    /** Maps, dedupes, and persists snapshots in small batches. */
    private void ingestNewSnapshots(RawBazaarResponse resp, Instant apiTs) {
        int persisted = 0;
        int skipped = 0;
        int sinceFlush = 0;

        Collection<RawBazaarProduct> products = resp.getProducts().values();
        for (RawBazaarProduct raw : products) {
            if (!shouldPersist(raw.getProductId(), apiTs)) {
                skipped++;
                continue;
            }

            BazaarProductSnapshot snap = buildSnapshot(raw, resp.getLastUpdated());
            em.persist(snap);
            persisted++;
            sinceFlush++;

            if (sinceFlush >= BATCH) {
                flushAndClear();
                sinceFlush = 0;
            }
        }

        flushAndClear();
        //log.info("Persisted {} snapshots (skipped {}).", persisted, skipped);
    }

    /** Fast boolean dedupe: skip if same productId + lastUpdated already stored. */
    private boolean shouldPersist(String productId, Instant apiTs) {
        return !snapshotRepo.existsByProductIdAndLastUpdated(productId, apiTs);
    }

    /** Build a snapshot entity and assign order indexes. */
    private BazaarProductSnapshot buildSnapshot(RawBazaarProduct raw, long apiLastUpdatedMs) {
        BazaarProductSnapshot snap = mapper.toSnapshot(raw, apiLastUpdatedMs);

        for (int i = 0; i < snap.getBuyOrders().size(); i++) {
            snap.getBuyOrders().get(i).setOrderIndex(i);
        }
        for (int i = 0; i < snap.getSellOrders().size(); i++) {
            snap.getSellOrders().get(i).setOrderIndex(i);
        }
        return snap;
    }

    /** Flush JDBC batch and drop references from the persistence context. */
    private void flushAndClear() {
        em.flush();
        em.clear();
    }
}