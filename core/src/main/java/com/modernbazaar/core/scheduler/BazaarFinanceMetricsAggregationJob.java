package com.modernbazaar.core.scheduler;

import com.modernbazaar.core.service.BazaarFinanceMetricsAggregationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Job que recalcula métricas financeiras agregadas (1h,6h,48h) mantendo apenas uma linha por janela.
 * Agenda em minuto 10 de cada hora para evitar colisão com compaction que roda logo após fechar a hora.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "skyblock.bazaar.finance.metrics", name = "enabled", havingValue = "true")
@Slf4j
public class BazaarFinanceMetricsAggregationJob {

    private final BazaarFinanceMetricsAggregationService service;
    private static final Object LOCK = new Object();

    // Minuto 10 de cada hora
    @Scheduled(cron = "0 10 * * * *")
    public void recompute() {
        synchronized (LOCK) {
            try {
                service.recomputeAll(Set.of(1,6,48));
            } catch (Exception ex) {
                log.error("Finance metrics aggregation failed", ex);
            }
        }
    }
}

