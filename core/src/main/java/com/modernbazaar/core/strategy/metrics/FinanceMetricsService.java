package com.modernbazaar.core.strategy.metrics;

import com.modernbazaar.core.domain.BazaarItemHourSummary;
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

    /** Obtém médias sobre as últimas 'windowHours' horas; se não houver dados, devolve Optional.empty(). */
    @Cacheable(value = "financeAverages", key = "#productId+'-'+#windowHours")
    @Transactional(readOnly = true)
    public Optional<FinanceAverages> getAverages(String productId, int windowHours) {
        if (windowHours <= 0) windowHours = 48;
        Pageable pg = PageRequest.of(0, windowHours);
        List<BazaarItemHourSummary> last = hourRepo.findLastByProductId(productId, pg);
        if (last == null || last.isEmpty()) return Optional.empty();
        return Optional.of(compute(productId, last));
    }

    /** Versão bulk simples (loop) com cache por produto; devolve apenas os presentes. */
    @Transactional(readOnly = true)
    public Map<String, FinanceAverages> getAveragesFor(Collection<String> productIds, int windowHours) {
        if (productIds == null || productIds.isEmpty()) return Collections.emptyMap();
        if (windowHours <= 0) windowHours = 48;

        // Se poucos produtos, mantém fallback simples (evita carregar muitas linhas à toa)
        if (productIds.size() == 1) {
            String id = productIds.iterator().next();
            Pageable pg = PageRequest.of(0, windowHours);
            List<BazaarItemHourSummary> last = hourRepo.findLastByProductId(id, pg);
            if (last == null || last.isEmpty()) return Collections.emptyMap();
            return Map.of(id, compute(id, last));
        }

        // Bulk query única para todas as productIds (janela limitada via windowHours)
        List<BazaarItemHourSummary> rows = hourRepo.findLastWindowByProductIds(productIds, windowHours);
        if (rows.isEmpty()) return Collections.emptyMap();

        // Agrupar por productId e computar médias
        Map<String, List<BazaarItemHourSummary>> byId = rows.stream()
                .collect(Collectors.groupingBy(BazaarItemHourSummary::getProductId));

        Map<String, FinanceAverages> out = new HashMap<>(byId.size());
        byId.forEach((id, list) -> {
            if (!list.isEmpty()) out.put(id, compute(id, list));
        });
        return out;
    }

    /**
     * Multi-window bulk: retorna médias para várias janelas (ex: 48,6,1) usando apenas 1 query por request.
     * Evita 2x consultas adicionais repetindo o mesmo dataset. Complexidade O(P * maxWindow).
     */
    @Transactional(readOnly = true)
    public Map<Integer, Map<String, FinanceAverages>> getMultiWindowAverages(Collection<String> productIds, int... windows) {
        if (productIds == null || productIds.isEmpty() || windows == null || windows.length == 0) {
            return Collections.emptyMap();
        }
        // Normalizar e remover duplicados/invalidos
        Set<Integer> winSet = Arrays.stream(windows)
                .filter(w -> w > 0)
                .boxed()
                .collect(Collectors.toCollection(TreeSet::new)); // ordenado asc
        if (winSet.isEmpty()) return Collections.emptyMap();
        int maxWindow = winSet.stream().max(Integer::compareTo).orElse(48);

        // Query única até maxWindow
        List<BazaarItemHourSummary> rows = hourRepo.findLastWindowByProductIds(productIds, maxWindow);
        if (rows.isEmpty()) return Collections.emptyMap();

        // Agrupar e ordenar por hora (desc) para "take first w"
        Map<String, List<BazaarItemHourSummary>> grouped = rows.stream()
                .collect(Collectors.groupingBy(BazaarItemHourSummary::getProductId));
        grouped.values().forEach(list -> list.sort(Comparator.comparing(BazaarItemHourSummary::getHourStart).reversed()));

        Map<Integer, Map<String, FinanceAverages>> result = new HashMap<>();
        for (Integer w : winSet) {
            Map<String, FinanceAverages> byId = new HashMap<>();
            for (var e : grouped.entrySet()) {
                List<BazaarItemHourSummary> sub = e.getValue().size() > w ? e.getValue().subList(0, w) : e.getValue();
                if (!sub.isEmpty()) {
                    byId.put(e.getKey(), compute(e.getKey(), sub));
                }
            }
            result.put(w, byId);
        }
        return result;
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
