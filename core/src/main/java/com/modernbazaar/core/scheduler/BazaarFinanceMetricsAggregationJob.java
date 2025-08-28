package com.modernbazaar.core.scheduler;

import com.modernbazaar.core.repository.BazaarFinanceMetricsRepository;
import com.modernbazaar.core.service.BazaarFinanceMetricsAggregationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.boot.context.event.ApplicationReadyEvent;

import java.util.Set;

/**
 * Job que recalcula métricas financeiras agregadas (1h,6h,48h) mantendo apenas uma linha por janela.
 * Usa intervalo configurável (interval-minutes) e dispara uma vez no arranque se a tabela estiver vazia.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "skyblock.bazaar.finance.metrics", name = "enabled", havingValue = "true")
@Slf4j
public class BazaarFinanceMetricsAggregationJob {

    private final BazaarFinanceMetricsAggregationService service;
    private final BazaarFinanceMetricsRepository metricsRepo;
    private static final Object LOCK = new Object();

    // Executa a cada N minutos (interval-minutes). Usa SpEL para multiplicar por 60000 (ms)
    @Scheduled(fixedDelayString = "#{${skyblock.bazaar.finance.metrics.interval-minutes:60} * 60000}")
    public void scheduledRun() { runInternal(false); }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        // se tabela vazia, força execução imediata
        if (metricsRepo.count() == 0L) {
            log.info("Finance metrics table vazia - execução inicial imediata");
            runInternal(true);
        }
    }

    private void runInternal(boolean startup) {
        synchronized (LOCK) {
            try {
                service.recomputeAll(Set.of(1,6,48));
            } catch (Exception ex) {
                log.error("Finance metrics aggregation failed (startup={})", startup, ex);
            }
        }
    }
}
