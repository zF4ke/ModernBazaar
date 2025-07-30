package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.*;
import com.modernbazaar.core.repository.*;
import com.modernbazaar.core.util.BazaarSnapshotToMinutePointMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class BazaarHourlyProcessingService {

    private final BazaarProductSnapshotRepository snapRepo;
    private final BazaarItemHourSummaryRepository summaryRepo;
    private final BazaarHourPointRepository pointRepo;
    private final BazaarSnapshotToMinutePointMapper mapper;

    @PersistenceContext
    private final EntityManager em;
    private final Executor bazaarExecutor;

    /* ── heuristics -------------------------------------------------------- */

    /** %‑move that forces us to *keep* the snapshot and resets prev‑price. */
    @Value("${skyblock.bazaar.processing.price-move-threshold:0.2}")
    private double PRICE_MOVE_THRESHOLD;

    /** keep at least one snapshot every N minutes even if prices are flat. */
    @Value("${skyblock.bazaar.processing.max-snapshot-gap-min:5}")
    private long   MAX_GAP_MINUTES;

    private static final int BATCH_POINTS = 256;      // flush batch

    /* ────────────────────────────────────────────────────────────────────── */

    /** Scheduler entry‑point — compacts exactly one UTC hour bucket. */
    @Transactional
    public void processSingleHour(Instant hourStart) {

        Instant hourEnd = hourStart.plus(1, ChronoUnit.HOURS);
        List<String> productIds = snapRepo.findProductIdsInHour(hourStart, hourEnd);
        if (productIds.isEmpty()) {
            log.debug("No snapshots to compact for {}", hourStart);
            return;
        }

        int totalKept = 0;
        for (String pid : productIds) {
            totalKept += compactProductHour(pid, hourStart, hourEnd);
        }

        /* heavy table gone → FK cascades wipe order entries */
        snapRepo.cascadeDeleteHour(hourStart, hourEnd);

        log.info("Hour {} → products={}  points kept={}", hourStart, productIds.size(), totalKept);
    }

    @Transactional(readOnly = true)
    public Instant findOldestSnapshotTimestamp() {
        return snapRepo.findOldestFetchedAt();
    }

    /* ================================================================= */
    /*  per‑product streaming compaction                                 */
    /* ================================================================= */

    private int compactProductHour(String productId, Instant from, Instant to) {

        /* ------------------------------------------------ summary initialisation */
        BazaarItemHourSummary sum = summaryRepo
                .findByProductIdAndHourStart(productId, from)
                .orElseGet(() -> summaryRepo.save(
                        BazaarItemHourSummary.builder()
                                .productId(productId)
                                .hourStart(from)
                                .build()));

        /* ------------------------------------------------ iteration state */
        List<BazaarItemSnapshot> kept = new ArrayList<>(BATCH_POINTS);
        int keptCount = 0;

        BazaarItemSnapshot first = null, prevKept = null, prevSnap = null;

        double minBuy = Double.MAX_VALUE, maxBuy = 0;
        double minSell = Double.MAX_VALUE, maxSell = 0;

        long newBuyOrders  = 0, newSellOrders  = 0;
        long itemsListedBuy  = 0, itemsListedSell = 0;

        int  prevActiveBuy  = 0, prevActiveSell = 0;
        long prevBuyVol     = 0, prevSellVol    = 0;

        long processed = 0;

        /* ------------------------------------------------ streaming cursor */
        try (Stream<BazaarItemSnapshot> st =
                     snapRepo.streamHourForProduct(productId, from, to)) {

            for (Iterator<BazaarItemSnapshot> it = st.iterator(); it.hasNext(); ) {
                BazaarItemSnapshot s = it.next();
                processed++;

                if (first == null) {
                    first = s;
                    prevKept = s;
                    prevSnap = s;

                    prevActiveBuy  = s.getActiveBuyOrdersCount();
                    prevActiveSell = s.getActiveSellOrdersCount();
                    prevBuyVol  = s.getBuyVolume();
                    prevSellVol = s.getSellVolume();
                    kept.add(s);                           // open
                } else {

                    /* --- metrics over *all* snapshots ---------------------- */
                    minBuy  = Math.min(minBuy , s.getInstantBuyPrice());
                    maxBuy  = Math.max(maxBuy , s.getInstantBuyPrice());
                    minSell = Math.min(minSell, s.getInstantSellPrice());
                    maxSell = Math.max(maxSell, s.getInstantSellPrice());

                    if (s.getActiveBuyOrdersCount() > prevActiveBuy) {
                        newBuyOrders   += s.getActiveBuyOrdersCount() - prevActiveBuy;
                        itemsListedBuy += s.getBuyVolume()  - prevBuyVol;
                    }
                    if (s.getActiveSellOrdersCount() > prevActiveSell) {
                        newSellOrders   += s.getActiveSellOrdersCount() - prevActiveSell;
                        itemsListedSell += s.getSellVolume() - prevSellVol;
                    }
                    prevActiveBuy  = s.getActiveBuyOrdersCount();
                    prevActiveSell = s.getActiveSellOrdersCount();
                    prevBuyVol  = s.getBuyVolume();
                    prevSellVol = s.getSellVolume();

                    /* --- kept minutes selection --------------------------- */
                    if (shouldKeep(prevKept, s)) {
                        kept.add(s);
                        prevKept = s;
                    }
                }

                /* --- batch flush  ---------------------------------------- */
                if (kept.size() >= BATCH_POINTS) {
//                    persistPoints(kept, sum);
                    keptCount += persistPoints(kept, sum);
                    kept.clear();
                }
            }

            /* tail flush */
            if (!kept.isEmpty()) {
                keptCount += persistPoints(kept, sum);
            }

            /* summary finalisation --------------------------------------- */
            BazaarItemSnapshot last = prevSnap;

            sum.setOpenInstantBuyPrice (first.getInstantBuyPrice());
            sum.setCloseInstantBuyPrice(last.getInstantBuyPrice());
            sum.setMinInstantBuyPrice (minBuy);
            sum.setMaxInstantBuyPrice (maxBuy);

            sum.setOpenInstantSellPrice (first.getInstantSellPrice());
            sum.setCloseInstantSellPrice(last.getInstantSellPrice());
            sum.setMinInstantSellPrice (minSell);
            sum.setMaxInstantSellPrice (maxSell);

            sum.setNewBuyOrders (newBuyOrders);
            sum.setNewSellOrders(newSellOrders);
            sum.setDeltaNewBuyOrders  (last.getActiveBuyOrdersCount()  - first.getActiveBuyOrdersCount());
            sum.setDeltaNewSellOrders (last.getActiveSellOrdersCount() - first.getActiveSellOrdersCount());

            sum.setItemsListedBuyOrders (itemsListedBuy);
            sum.setItemsListedSellOrders(itemsListedSell);

            summaryRepo.save(sum);
        }

        log.debug("  • {} → processed={} kept={}", productId, processed, keptCount);
        return keptCount;
    }

    /* --------------------------------------------------------------------- */
    private boolean shouldKeep(BazaarItemSnapshot prev, BazaarItemSnapshot curr) {
        if (prev == null) return true;

        boolean bigGap = Duration.between(prev.getFetchedAt(), curr.getFetchedAt())
                .compareTo(Duration.ofMinutes(MAX_GAP_MINUTES)) >= 0;

        boolean priceJump =
                moved(prev.getInstantSellPrice(), curr.getInstantSellPrice()) ||
                        moved(prev.getInstantBuyPrice() , curr.getInstantBuyPrice());

        return bigGap || priceJump;
    }

    private int persistPoints(List<BazaarItemSnapshot> snaps,
                               BazaarItemHourSummary summary) {
        List<BazaarItemHourPoint> pts = snaps.stream()
                .map(s -> mapper.toMinute(s, summary))
                .toList();
        pointRepo.saveAll(pts);
        em.flush();
        em.clear();
        return pts.size();
    }

    private boolean moved(double oldP, double newP) {
        if (oldP == 0) return true;
        return Math.abs(newP - oldP) / oldP >= PRICE_MOVE_THRESHOLD;
    }
}
