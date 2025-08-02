package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.BazaarItemHourPoint;
import com.modernbazaar.core.domain.BazaarItemHourSummary;
import com.modernbazaar.core.domain.BazaarItemSnapshot;
import com.modernbazaar.core.repository.BazaarProductSnapshotRepository;
import com.modernbazaar.core.repository.BazaarItemHourSummaryRepository;
import com.modernbazaar.core.repository.BazaarHourPointRepository;
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
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.Executor;
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

    @Value("${skyblock.bazaar.processing.price-move-threshold:0.2}")
    private double PRICE_MOVE_THRESHOLD;

    @Value("${skyblock.bazaar.processing.max-snapshot-gap-min:5}")
    private long MAX_GAP_MINUTES;

    private static final int BATCH_POINTS = 256;

    /**
     * Processes exactly one 1-hour window starting at the oldest snapshot timestamp.
     */
    @Transactional
    public void processSingleHour(Instant windowStart) {
        Instant windowEnd = windowStart.plus(1, ChronoUnit.HOURS);
        List<String> productIds = snapRepo.findProductIdsInHour(windowStart, windowEnd);
        if (productIds.isEmpty()) {
            log.debug("No snapshots to compact for {}", windowStart);
            return;
        }

        int totalKept = 0;
        for (String pid : productIds) {
            totalKept += compactProductHour(pid, windowStart, windowEnd);
        }

        // Delete all snapshots (and associated order entries) in this window
        snapRepo.cascadeDeleteHour(windowStart, windowEnd);

        log.info("Window {} → products={}  points kept={}", windowStart, productIds.size(), totalKept);
    }

    /**
     * Returns the timestamp of the oldest unprocessed snapshot, or null if none.
     */
    @Transactional(readOnly = true)
    public Instant findOldestSnapshotTimestamp() {
        return snapRepo.findOldestFetchedAt();
    }

    private int compactProductHour(String productId, Instant from, Instant to) {
        BazaarItemHourSummary sum = summaryRepo
                .findByProductIdAndHourStart(productId, from)
                .orElseGet(() -> summaryRepo.save(
                        BazaarItemHourSummary.builder()
                                .productId(productId)
                                .hourStart(from)
                                .build()));

        List<BazaarItemSnapshot> kept = new ArrayList<>(BATCH_POINTS);
        int keptCount = 0;

        BazaarItemSnapshot first = null, prevKept = null, prevSnap = null;

        double minBuy = Double.MAX_VALUE, maxBuy = 0;
        double minSell = Double.MAX_VALUE, maxSell = 0;

        long createdBuyOrders = 0, createdSellOrders = 0;
        long addedItemsBuyOrders = 0, addedItemsSellOrders = 0;

        int prevActiveBuy = 0, prevActiveSell = 0;
        long prevBuyVol = 0, prevSellVol = 0;

        long processed = 0;

        try (Stream<BazaarItemSnapshot> st =
                     snapRepo.streamHourForProductWithOrders(productId, from, to)) {

            for (Iterator<BazaarItemSnapshot> it = st.iterator(); it.hasNext(); ) {
                BazaarItemSnapshot s = it.next();
                processed++;

                if (first == null) {
                    first = s;
                    prevKept = s;
                    prevSnap = s;

                    prevActiveBuy = s.getActiveBuyOrdersCount();
                    prevActiveSell = s.getActiveSellOrdersCount();
                    prevBuyVol = s.getBuyVolume();
                    prevSellVol = s.getSellVolume();

                    kept.add(s);
                } else {
                    prevSnap = s;
                    // track min/max
                    minBuy = Math.min(minBuy, s.getInstantBuyPrice());
                    maxBuy = Math.max(maxBuy, s.getInstantBuyPrice());
                    minSell = Math.min(minSell, s.getInstantSellPrice());
                    maxSell = Math.max(maxSell, s.getInstantSellPrice());

                    // new orders & volumes
                    if (s.getActiveBuyOrdersCount() > prevActiveBuy) {
//                        newBuyOrders += s.getActiveBuyOrdersCount() - prevActiveBuy;
                        // absolute difference in buy orders Math.abs()
                        createdBuyOrders += Math.abs(s.getActiveBuyOrdersCount() - prevActiveBuy);
//                        itemsListedBuy += s.getBuyVolume() - prevBuyVol;
                        addedItemsBuyOrders += Math.abs(s.getBuyVolume() - prevBuyVol);
                    }
                    if (s.getActiveSellOrdersCount() > prevActiveSell) {
//                        newSellOrders += s.getActiveSellOrdersCount() - prevActiveSell;
                        // absolute difference in sell orders Math.abs()
                        createdSellOrders += Math.abs(s.getActiveSellOrdersCount() - prevActiveSell);
                        addedItemsSellOrders += Math.abs(s.getSellVolume() - prevSellVol);
                    }
                    prevActiveBuy = s.getActiveBuyOrdersCount();
                    prevActiveSell = s.getActiveSellOrdersCount();
                    prevBuyVol = s.getBuyVolume();
                    prevSellVol = s.getSellVolume();

                    // decide if we should keep this snapshot
                    if (shouldKeep(prevKept, s)) {
                        kept.add(s);
                        prevKept = s;
                    }
                }

                if (kept.size() >= BATCH_POINTS) {
                    keptCount += persistPoints(kept, sum);
                    kept.clear();
                }
            }

            if (!kept.isEmpty()) {
                keptCount += persistPoints(kept, sum);
            }

            // Finalize summary
            BazaarItemSnapshot last = prevSnap;
            sum.setOpenInstantBuyPrice(first.getInstantBuyPrice());
            sum.setCloseInstantBuyPrice(last.getInstantBuyPrice());
            sum.setMinInstantBuyPrice(minBuy);
            sum.setMaxInstantBuyPrice(maxBuy);

            sum.setOpenInstantSellPrice(first.getInstantSellPrice());
            sum.setCloseInstantSellPrice(last.getInstantSellPrice());
            sum.setMinInstantSellPrice(minSell);
            sum.setMaxInstantSellPrice(maxSell);

            sum.setCreatedBuyOrders(createdBuyOrders);
            sum.setCreatedSellOrders(createdSellOrders);
            sum.setDeltaBuyOrders(last.getActiveBuyOrdersCount() - first.getActiveBuyOrdersCount());
            sum.setDeltaSellOrders(last.getActiveSellOrdersCount() - first.getActiveSellOrdersCount());

            sum.setAddedItemsSellOrders(addedItemsSellOrders);
            sum.setAddedItemsBuyOrders(addedItemsBuyOrders);

            sum.setDeltaBuyOrders(
                    last.getBuyVolume() - first.getBuyVolume());
            sum.setDeltaSellOrders(
                    last.getSellVolume() - first.getSellVolume());

//            sum.setListedItemsBuyOrders(last.getBuyVolume());
//            sum.setListedItemsSellOrders(last.getSellVolume());

            summaryRepo.save(sum);
        }

        log.debug("  • {} → processed={} kept={}", productId, processed, keptCount);
        return keptCount;
    }

    private boolean shouldKeep(BazaarItemSnapshot prev, BazaarItemSnapshot curr) {
        if (prev == null) return true;
        boolean bigGap = Duration.between(prev.getFetchedAt(), curr.getFetchedAt())
                .compareTo(Duration.ofMinutes(MAX_GAP_MINUTES)) >= 0;
        boolean priceJump = moved(prev.getInstantSellPrice(), curr.getInstantSellPrice()) ||
                moved(prev.getInstantBuyPrice(), curr.getInstantBuyPrice());
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