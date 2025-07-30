package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.*;
import com.modernbazaar.core.repository.*;
import com.modernbazaar.core.util.BazaarSnapshotToMinutePointMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BazaarHourlyProcessingService {

    private final BazaarProductSnapshotRepository   snapRepo;
    private final BazaarItemHourSummaryRepository hourSummaryRepo;
    private final BazaarHourPointRepository hourPointRepo;
    private final BazaarSnapshotToMinutePointMapper mapper;

    @PersistenceContext
    private final EntityManager em;

    /* ── heuristics -------------------------------------------------------- */

    /** %‑move that forces us to *keep* the snapshot and resets prev‑price. */
    @Value("${skyblock.bazaar.processing.price-move-threshold:0.2}")
    private double PRICE_MOVE_THRESHOLD;

    /** keep at least one snapshot every N minutes even if prices are flat. */
    @Value("${skyblock.bazaar.processing.max-snapshot-gap-min:5}")
    private long   MAX_GAP_MINUTES;

    /* ────────────────────────────────────────────────────────────────────── */

    /**
     * Compacts all snapshots s.t. fetchedAt ∈ [hourStart, hourStart + 1 h).
     */
    @Transactional
    public void processSingleHour(Instant hourStart) {

        Instant hourEnd = hourStart.plus(1, ChronoUnit.HOURS);
        List<BazaarItemSnapshot> raw =
                snapRepo.findAllByFetchedAtBetween(hourStart, hourEnd);

        if (raw.isEmpty()) {
            log.debug("No snapshots to compact for {}", hourStart);
            return;
        }

        Map<String, List<BazaarItemSnapshot>> byProduct =
                raw.stream().collect(Collectors.groupingBy(BazaarItemSnapshot::getProductId));

        int keptTotal = 0;

        for (var e : byProduct.entrySet()) {

            String productId = e.getKey();
            List<BazaarItemSnapshot> snaps = e.getValue();
            snaps.sort(Comparator.comparing(BazaarItemSnapshot::getFetchedAt));

            /* -------- STEP 1 – choose which snapshots we keep as minute points ---- */
            List<BazaarItemSnapshot> kept = chooseSnapshotsToKeep(snaps);
            keptTotal += kept.size();

            /* -------- STEP 2 – metrics over *all* snapshots ---------------------- */
            Stats stats = computeStats(snaps);

            /* -------- STEP 3 – persist ------------------------------------------ */
            BazaarItemHourSummary hp = hourSummaryRepo
                    .findByProductIdAndHourStart(productId, hourStart)
                    .orElseGet(() -> hourSummaryRepo.save(
                            BazaarItemHourSummary.builder()
                                    .productId(productId)
                                    .hourStart(hourStart)
                                    .build()));

            // fill hour‑point
            hp.setOpenInstantSellPrice(stats.openSell);
            hp.setCloseInstantSellPrice(stats.closeSell);
            hp.setMinInstantSellPrice(stats.minSell);
            hp.setMaxInstantSellPrice(stats.maxSell);

            hp.setOpenInstantBuyPrice(stats.openBuy);
            hp.setCloseInstantBuyPrice(stats.closeBuy);
            hp.setMinInstantBuyPrice(stats.minBuy);
            hp.setMaxInstantBuyPrice(stats.maxBuy);

            hp.setNewSellOrders(stats.newSellOrders);
            hp.setDeltaNewSellOrders(stats.deltaNewSellOrders);
            hp.setNewBuyOrders(stats.newBuyOrders);
            hp.setDeltaNewBuyOrders(stats.deltaNewBuyOrders);

            hp.setItemsListedSellOrders(stats.itemsListedSell);
            hp.setItemsListedBuyOrders(stats.itemsListedBuy);

            hourSummaryRepo.save(hp);

            // map kept → minute points
            List<BazaarItemHourPoint> minutes = kept.stream()
                    .map(s -> mapper.toMinute(s, hp))
                    .toList();
            hourPointRepo.saveAll(minutes);
        }

        /* clean up heavy table */
//        snapRepo.deleteAllInBatch(raw);
        snapRepo.deleteAll(raw);
        em.flush();
        em.clear();

        log.info("Compacted {} raw → {} kept → minute/hour points for hour {}",
                raw.size(), keptTotal, hourStart);
    }

    @Transactional(readOnly = true)
    public Instant findOldestSnapshotTimestamp() {
        return snapRepo.findOldestFetchedAt();
    }

    /* ── helper classes / methods ───────────────────────────────────────── */

    private record Stats(
            double openSell, double closeSell,
            double minSell,  double maxSell,
            double openBuy,  double closeBuy,
            double minBuy,   double maxBuy,
            long newSellOrders, long deltaNewSellOrders,
            long newBuyOrders,  long deltaNewBuyOrders,
            long itemsListedSell, long itemsListedBuy) {}

    /** pick snapshots to keep as minute points (first, last, jumps, gaps) */
    private List<BazaarItemSnapshot> chooseSnapshotsToKeep(List<BazaarItemSnapshot> snaps) {

        List<BazaarItemSnapshot> kept = new ArrayList<>();
        Duration maxGap = Duration.ofMinutes(MAX_GAP_MINUTES);

        BazaarItemSnapshot prev = null;

        for (BazaarItemSnapshot s : snaps) {
            if (prev == null) {               // first one always
                kept.add(s);
                prev = s;
                continue;
            }
            boolean priceJump =
                    moved(prev.getInstantSellPrice(), s.getInstantSellPrice()) ||
                            moved(prev.getInstantBuyPrice() , s.getInstantBuyPrice());

            boolean bigGap =
                    Duration.between(prev.getFetchedAt(), s.getFetchedAt())
                            .compareTo(maxGap) >= 0;

            if (priceJump || bigGap) {
                kept.add(s);
                prev = s;
            }
        }
        if (!kept.getLast().equals(snaps.getLast())) {
            kept.add(snaps.getLast());        // make sure we have the close
        }
        return kept;
    }

    /** hour‑level stats using simple positive‑delta counting */
    private Stats computeStats(List<BazaarItemSnapshot> snaps) {

        BazaarItemSnapshot first = snaps.getFirst();
        BazaarItemSnapshot last  = snaps.getLast();

        double openSell = first.getInstantSellPrice();
        double openBuy  = first.getInstantBuyPrice();

        double minSell = Double.MAX_VALUE, maxSell = 0;
        double minBuy  = Double.MAX_VALUE, maxBuy  = 0;

        long newSellOrders   = 0;
        long newBuyOrders    = 0;
        long itemsListedSell = 0;
        long itemsListedBuy  = 0;

        int prevActiveSell = first.getActiveSellOrdersCount();
        int prevActiveBuy  = first.getActiveBuyOrdersCount();
        long prevItemsListedSell = first.getSellVolume();
        long prevItemsListedBuy  = first.getBuyVolume();

        for (BazaarItemSnapshot s : snaps) {

            /* OHLC min/max (instant) */
            minSell = Math.min(minSell, s.getInstantSellPrice());
            maxSell = Math.max(maxSell, s.getInstantSellPrice());
            minBuy  = Math.min(minBuy , s.getInstantBuyPrice());
            maxBuy  = Math.max(maxBuy , s.getInstantBuyPrice());

            /* new‑order counting: simple positive delta */
            if (s.getActiveSellOrdersCount() > prevActiveSell) {
                newSellOrders   += s.getActiveSellOrdersCount() - prevActiveSell;
                itemsListedSell += s.getSellVolume() - prevItemsListedSell;
            }
            if (s.getActiveBuyOrdersCount()  > prevActiveBuy) {
                newBuyOrders    += s.getActiveBuyOrdersCount() - prevActiveBuy;
                itemsListedBuy  += s.getBuyVolume() - prevItemsListedBuy;
            }

            prevActiveSell = s.getActiveSellOrdersCount();
            prevActiveBuy  = s.getActiveBuyOrdersCount();
        }

        return new Stats(
                openSell, last.getInstantSellPrice(),
                minSell , maxSell,
                openBuy , last.getInstantBuyPrice(),
                minBuy  , maxBuy,
                newSellOrders, last.getActiveSellOrdersCount() - first.getActiveSellOrdersCount(),
                newBuyOrders , last.getActiveBuyOrdersCount()  - first.getActiveBuyOrdersCount(),
                itemsListedSell, itemsListedBuy
        );
    }

    /* relative move ≥ threshold */
    private boolean moved(double oldP, double newP) {
        if (oldP == 0) return true;
        return Math.abs(newP - oldP) / oldP >= PRICE_MOVE_THRESHOLD;
    }
}
