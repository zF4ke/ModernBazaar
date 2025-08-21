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

/**
 * Toolkit reutilizável de métricas financeiras/operacionais agregadas sobre janelas de horas.
 * Fornece médias simples que podem alimentar modelos/estratégias (ex.: competição via churn de ordens).
 */
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
        if (windowHours <= 0) windowHours = 48;
        Pageable pg = PageRequest.of(0, windowHours);
        Map<String, FinanceAverages> out = new HashMap<>();
        for (String id : productIds) {
            List<BazaarItemHourSummary> last = hourRepo.findLastByProductId(id, pg);
            if (last != null && !last.isEmpty()) {
                out.put(id, compute(id, last));
            }
        }
        return out;
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
