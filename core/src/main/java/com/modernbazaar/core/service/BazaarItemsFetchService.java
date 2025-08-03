package com.modernbazaar.core.service;

import com.modernbazaar.core.dto.RawBazaarResponse;
import com.modernbazaar.core.dto.RawBazaarProduct;
import com.modernbazaar.core.domain.BazaarItemSnapshot;
import com.modernbazaar.core.repository.BazaarItemRepository;
import com.modernbazaar.core.repository.BazaarProductSnapshotRepository;
import com.modernbazaar.core.util.RawBazaarProductToSnapshotMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class BazaarItemsFetchService {

    private final WebClient webClient;
    private final RawBazaarProductToSnapshotMapper mapper;
    private final BazaarProductSnapshotRepository snapshotRepo;
    private final BazaarItemRepository itemRepo;

    private final static String BAZAAR_API_URI = "/skyblock/bazaar";
    private static final int BATCH_SIZE = 50;

    @PersistenceContext
    private EntityManager em;

    /** Entry point called by the scheduler. One TX, small batches, clear PC. */
    @Transactional
    public void fetchAndStore() {
        RawBazaarResponse resp = fetchBazaar();
        if (resp == null || !resp.isSuccess()) return;

        Instant apiTs = Instant.ofEpochMilli(resp.getLastUpdated());
        upsertNewItems(resp);

        int sinceFlush = 0;
        for (RawBazaarProduct raw : resp.getProducts().values()) {
            if (!shouldPersist(raw.getProductId(), apiTs)) continue;
            BazaarItemSnapshot snap = buildSnapshot(raw, resp.getLastUpdated());
            em.persist(snap);

            if (++sinceFlush >= BATCH_SIZE) {
                em.flush();
                em.clear();
                sinceFlush = 0;
            }
        }
        em.flush();
        em.clear();
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

    /** Fast boolean dedupe: skip if same productId + lastUpdated already stored. */
    private boolean shouldPersist(String productId, Instant apiTs) {
        return !snapshotRepo.existsByProductIdAndLastUpdated(productId, apiTs);
    }

    /** Build a snapshot entity and assign order indexes. */
    private BazaarItemSnapshot buildSnapshot(RawBazaarProduct raw, long apiLastUpdatedMs) {
        BazaarItemSnapshot snap = mapper.toSnapshot(raw, apiLastUpdatedMs);

        for (int i = 0; i < snap.getBuyOrders().size(); i++) {
            snap.getBuyOrders().get(i).setOrderIndex(i);
        }
        for (int i = 0; i < snap.getSellOrders().size(); i++) {
            snap.getSellOrders().get(i).setOrderIndex(i);
        }
        return snap;
    }
}