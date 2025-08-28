package com.modernbazaar.core.strategy.metrics;

import com.modernbazaar.core.domain.BazaarFinanceMetrics;
import com.modernbazaar.core.domain.BazaarItemHourSummary;
import com.modernbazaar.core.repository.BazaarFinanceMetricsRepository;
import com.modernbazaar.core.repository.BazaarItemHourSummaryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FinanceMetricsService {

    private final BazaarItemHourSummaryRepository hourRepo;
    private final BazaarFinanceMetricsRepository metricsRepo;

    /** Obtém médias sobre as últimas 'windowHours' horas; tenta usar pré-computado. */
    @Cacheable(value = "financeAverages", key = "#productId+'-'+#windowHours")
    @Transactional(readOnly = true)
    public Optional<FinanceAverages> getAverages(String productId, int windowHours) {
        if (windowHours <= 0) windowHours = 48;
        // 1) tenta pré-computado
        Optional<BazaarFinanceMetrics> pre = metricsRepo.findByProductIdAndWindowHours(productId, windowHours);
        if (pre.isPresent()) return pre.map(this::toAverages);
        // 2) fallback dinâmico
        Pageable pg = PageRequest.of(0, windowHours);
        List<BazaarItemHourSummary> last = hourRepo.findLastByProductId(productId, pg);
        if (last == null || last.isEmpty()) return Optional.empty();
        return Optional.of(compute(productId, last));
    }

    /** Versão bulk simples: tenta usar métricas pré-computadas e faz fallback só para faltantes. */
    @Transactional(readOnly = true)
    public Map<String, FinanceAverages> getAveragesFor(Collection<String> productIds, int windowHours) {
        if (productIds == null || productIds.isEmpty()) return Collections.emptyMap();
        if (windowHours <= 0) windowHours = 48;

        Map<String, FinanceAverages> out = new HashMap<>();
        // pré-computado
        List<BazaarFinanceMetrics> pre = metricsRepo.findByWindowHoursAndProductIdIn(windowHours, productIds);
        for (BazaarFinanceMetrics m : pre) out.put(m.getProductId(), toAverages(m));

        // faltantes -> fallback
        Set<String> missing = productIds.stream().filter(id -> !out.containsKey(id)).collect(Collectors.toSet());
        if (!missing.isEmpty()) {
            if (missing.size() == 1) {
                String id = missing.iterator().next();
                Pageable pg = PageRequest.of(0, windowHours);
                List<BazaarItemHourSummary> last = hourRepo.findLastByProductId(id, pg);
                if (last != null && !last.isEmpty()) out.put(id, compute(id, last));
            } else {
                List<BazaarItemHourSummary> rows = hourRepo.findLastWindowByProductIds(missing, windowHours);
                Map<String, List<BazaarItemHourSummary>> byId = rows.stream().collect(Collectors.groupingBy(BazaarItemHourSummary::getProductId));
                byId.forEach((id, list) -> { if (!list.isEmpty()) out.put(id, compute(id, list)); });
            }
        }
        return out;
    }

    /** Multi-window: prioritiza pré-computadas, fallback só para combos faltantes com 1 query ampla. */
    @Transactional(readOnly = true)
    public Map<Integer, Map<String, FinanceAverages>> getMultiWindowAverages(Collection<String> productIds, int... windows) {
        if (productIds == null || productIds.isEmpty() || windows == null || windows.length == 0) return Collections.emptyMap();
        Set<Integer> winSet = Arrays.stream(windows).filter(w -> w > 0).boxed().collect(Collectors.toCollection(TreeSet::new));
        if (winSet.isEmpty()) return Collections.emptyMap();
        int maxWindow = winSet.stream().max(Integer::compareTo).orElse(48);

        // Carrega todas métricas pré-computadas para esses windows
        List<BazaarFinanceMetrics> pre = metricsRepo.findByWindowHoursInAndProductIdIn(winSet, productIds);
        Map<Integer, Map<String, FinanceAverages>> result = new HashMap<>();
        for (Integer w : winSet) result.put(w, new HashMap<>());
        for (BazaarFinanceMetrics m : pre) {
            result.get(m.getWindowHours()).put(m.getProductId(), toAverages(m));
        }

        // Determinar combos faltantes (se algum) e fazer UMA query grande até maxWindow para fallback
        boolean anyMissing = result.entrySet().stream().anyMatch(e -> e.getValue().size() < productIds.size());
        if (anyMissing) {
            System.out.println("FinanceMetrics multi-window fallback: windows=" + winSet + " maxWindow=" + maxWindow);
            List<BazaarItemHourSummary> rows = hourRepo.findLastWindowByProductIds(productIds, maxWindow);
            if (!rows.isEmpty()) {
                Map<String, List<BazaarItemHourSummary>> grouped = rows.stream().collect(Collectors.groupingBy(BazaarItemHourSummary::getProductId));
                grouped.values().forEach(list -> list.sort(Comparator.comparing(BazaarItemHourSummary::getHourStart).reversed()));
                for (Integer w : winSet) {
                    Map<String, FinanceAverages> map = result.get(w);
                    for (var e : grouped.entrySet()) {
                        if (map.containsKey(e.getKey())) continue; // já coberto por pré-computado
                        List<BazaarItemHourSummary> sub = e.getValue().size() > w ? e.getValue().subList(0, w) : e.getValue();
                        if (!sub.isEmpty()) map.put(e.getKey(), compute(e.getKey(), sub));
                    }
                }
            }
        }
        return result;
    }

    private FinanceAverages toAverages(BazaarFinanceMetrics m) {
        return new FinanceAverages(
                m.getProductId(),
                m.getWindowHours(),
                m.getAvgOpenInstantBuy(),
                m.getAvgCloseInstantBuy(),
                m.getAvgMinInstantBuy(),
                m.getAvgMaxInstantBuy(),
                m.getAvgOpenInstantSell(),
                m.getAvgCloseInstantSell(),
                m.getAvgMinInstantSell(),
                m.getAvgMaxInstantSell(),
                m.getAvgCreatedBuyOrders(),
                m.getAvgCreatedSellOrders(),
                m.getAvgDeltaBuyOrders(),
                m.getAvgDeltaSellOrders(),
                m.getAvgAddedItemsBuyOrders(),
                m.getAvgAddedItemsSellOrders(),
                m.getAvgInstaBoughtItems(),
                m.getAvgInstaSoldItems()
        );
    }

    private FinanceAverages compute(String productId, List<BazaarItemHourSummary> last) {
        int n = last.size();
        double avgOpenBuy  = last.stream().mapToDouble(BazaarItemHourSummary::getOpenInstantBuyPrice).average().orElse(0.0);
        double avgCloseBuy = last.stream().mapToDouble(BazaarItemHourSummary::getCloseInstantBuyPrice).average().orElse(0.0);
        double avgMinBuy   = last.stream().mapToDouble(BazaarItemHourSummary::getMinInstantBuyPrice).average().orElse(0.0);
        double avgMaxBuy   = last.stream().mapToDouble(BazaarItemHourSummary::getMaxInstantBuyPrice).average().orElse(0.0);
        double avgOpenSell  = last.stream().mapToDouble(BazaarItemHourSummary::getOpenInstantSellPrice).average().orElse(0.0);
        double avgCloseSell = last.stream().mapToDouble(BazaarItemHourSummary::getCloseInstantSellPrice).average().orElse(0.0);
        double avgMinSell   = last.stream().mapToDouble(BazaarItemHourSummary::getMinInstantSellPrice).average().orElse(0.0);
        double avgMaxSell   = last.stream().mapToDouble(BazaarItemHourSummary::getMaxInstantSellPrice).average().orElse(0.0);
        double avgCreatedBuy  = last.stream().mapToDouble(BazaarItemHourSummary::getCreatedBuyOrders).average().orElse(0.0);
        double avgCreatedSell = last.stream().mapToDouble(BazaarItemHourSummary::getCreatedSellOrders).average().orElse(0.0);
        double avgDeltaBuy    = last.stream().mapToDouble(BazaarItemHourSummary::getDeltaBuyOrders).average().orElse(0.0);
        double avgDeltaSell   = last.stream().mapToDouble(BazaarItemHourSummary::getDeltaSellOrders).average().orElse(0.0);
        double avgAddedBuy    = last.stream().mapToDouble(BazaarItemHourSummary::getAddedItemsBuyOrders).average().orElse(0.0);
        double avgAddedSell   = last.stream().mapToDouble(BazaarItemHourSummary::getAddedItemsSellOrders).average().orElse(0.0);
        double avgInstaBought = last.stream().mapToDouble(BazaarItemHourSummary::getInstaBoughtItems).average().orElse(0.0);
        double avgInstaSold   = last.stream().mapToDouble(BazaarItemHourSummary::getInstaSoldItems).average().orElse(0.0);
        return new FinanceAverages(
                productId,
                n,
                avgOpenBuy,
                avgCloseBuy,
                avgMinBuy,
                avgMaxBuy,
                avgOpenSell,
                avgCloseSell,
                avgMinSell,
                avgMaxSell,
                avgCreatedBuy,
                avgCreatedSell,
                avgDeltaBuy,
                avgDeltaSell,
                avgAddedBuy,
                avgAddedSell,
                avgInstaBought,
                avgInstaSold
        );
    }
}
