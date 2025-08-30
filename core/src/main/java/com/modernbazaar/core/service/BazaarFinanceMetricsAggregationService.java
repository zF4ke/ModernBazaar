package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.BazaarFinanceMetrics;
import com.modernbazaar.core.domain.BazaarItemHourSummary;
import com.modernbazaar.core.repository.BazaarFinanceMetricsRepository;
import com.modernbazaar.core.repository.BazaarItemHourSummaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BazaarFinanceMetricsAggregationService {

    private final BazaarItemHourSummaryRepository hourRepo;
    private final BazaarFinanceMetricsRepository metricsRepo;

    /** Recalcula métricas pré-computadas para todas as productIds e janelas pedidas. Mantém só 1 linha (upsert). */
    @Transactional
    @CacheEvict(value = "financeAverages", allEntries = true)
    public void recomputeAll(Collection<Integer> windows) {
        if (windows == null || windows.isEmpty()) return;
        // normalizar janelas >0
        List<Integer> winList = windows.stream().filter(w -> w != null && w > 0).distinct().sorted().toList();
        if (winList.isEmpty()) return;
        int maxWindow = winList.get(winList.size()-1);

        List<String> allIds = hourRepo.findDistinctProductIds();
        if (allIds.isEmpty()) return;

        final int batchSize = 500;
        Instant now = Instant.now();
        for (int i=0;i<allIds.size();i+=batchSize) {
            List<String> batch = allIds.subList(i, Math.min(allIds.size(), i+batchSize));
            // 1 query grande até maxWindow
            List<BazaarItemHourSummary> rows = hourRepo.findLastWindowByProductIds(batch, maxWindow);
            if (rows.isEmpty()) continue;
            Map<String, List<BazaarItemHourSummary>> grouped = rows.stream().collect(Collectors.groupingBy(BazaarItemHourSummary::getProductId));
            grouped.values().forEach(list -> list.sort(Comparator.comparing(BazaarItemHourSummary::getHourStart).reversed()));

            int upsertCount = 0;
            for (String pid : batch) {
                List<BazaarItemHourSummary> list = grouped.get(pid);
                if (list == null || list.isEmpty()) continue;
                for (Integer w : winList) {
                    List<BazaarItemHourSummary> sub = list.size() > w ? list.subList(0, w) : list;
                    if (sub.isEmpty()) continue;
                    BazaarFinanceMetrics m = metricsRepo.findByProductIdAndWindowHours(pid, w).orElse(null);
                    if (m == null) {
                        m = BazaarFinanceMetrics.builder()
                                .productId(pid)
                                .windowHours(w)
                                .build();
                    }
                    fillMetrics(m, sub, now);
                    metricsRepo.save(m);
                    upsertCount++;
                }
            }
            log.info("FinanceMetrics aggregation batch {} - {} items, upserts={} windows={}", (i/batchSize)+1, batch.size(), upsertCount, winList);
            metricsRepo.flush();
        }
    }

    private void fillMetrics(BazaarFinanceMetrics m, List<BazaarItemHourSummary> last, Instant now) {
        int n = last.size();
        m.setComputedAt(now);
        m.setObservations(n);
        m.setAvgOpenInstantBuy(avg(last, BazaarItemHourSummary::getOpenInstantBuyPrice));
        m.setAvgCloseInstantBuy(avg(last, BazaarItemHourSummary::getCloseInstantBuyPrice));
        m.setAvgMinInstantBuy(avg(last, BazaarItemHourSummary::getMinInstantBuyPrice));
        m.setAvgMaxInstantBuy(avg(last, BazaarItemHourSummary::getMaxInstantBuyPrice));
        m.setAvgOpenInstantSell(avg(last, BazaarItemHourSummary::getOpenInstantSellPrice));
        m.setAvgCloseInstantSell(avg(last, BazaarItemHourSummary::getCloseInstantSellPrice));
        m.setAvgMinInstantSell(avg(last, BazaarItemHourSummary::getMinInstantSellPrice));
        m.setAvgMaxInstantSell(avg(last, BazaarItemHourSummary::getMaxInstantSellPrice));
        m.setAvgCreatedBuyOrders(avg(last, BazaarItemHourSummary::getCreatedBuyOrders));
        m.setAvgCreatedSellOrders(avg(last, BazaarItemHourSummary::getCreatedSellOrders));
        m.setAvgDeltaBuyOrders(avg(last, BazaarItemHourSummary::getDeltaBuyOrders));
        m.setAvgDeltaSellOrders(avg(last, BazaarItemHourSummary::getDeltaSellOrders));
        m.setAvgAddedItemsBuyOrders(avg(last, BazaarItemHourSummary::getAddedItemsBuyOrders));
        m.setAvgAddedItemsSellOrders(avg(last, BazaarItemHourSummary::getAddedItemsSellOrders));
        m.setAvgInstaBoughtItems(avg(last, BazaarItemHourSummary::getInstaBoughtItems));
        m.setAvgInstaSoldItems(avg(last, BazaarItemHourSummary::getInstaSoldItems));
    }

    private double avg(List<BazaarItemHourSummary> list, ToDouble<BazaarItemHourSummary> f) {
        if (list == null || list.isEmpty()) return 0.0;
        double sum = 0; int c=0;
        for (BazaarItemHourSummary s : list) { sum += f.apply(s); c++; }
        return c==0?0.0: sum / c;
    }

    @FunctionalInterface private interface ToDouble<T>{ double apply(T t); }
}

