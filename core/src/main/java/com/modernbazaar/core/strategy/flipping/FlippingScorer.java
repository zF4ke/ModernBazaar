package com.modernbazaar.core.strategy.flipping;

import com.modernbazaar.core.api.dto.BazaarItemFilterDTO;
import com.modernbazaar.core.api.dto.FlipOpportunityResponseDTO;
import com.modernbazaar.core.domain.BazaarItem;
import com.modernbazaar.core.domain.BazaarItemSnapshot;
import com.modernbazaar.core.repository.BazaarItemRepository;
import com.modernbazaar.core.repository.BazaarProductSnapshotRepository;
import com.modernbazaar.core.strategy.metrics.FinanceAverages;
import com.modernbazaar.core.strategy.metrics.FinanceMetricsService;
import com.modernbazaar.core.strategy.metrics.RiskToolkit;
import com.modernbazaar.core.strategy.metrics.RiskToolkit.RiskAssessment;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * FlippingScorer — score único de eficiência para Bazaar Flipping.
 *
 * Objetivo
 * - Rankear oportunidades que maximizam lucro executável por unidade de tempo e capital,
 *   com penalização explícita por competição e risco (desvio vs referências),
 *   respeitando limitações de budget e escoamento (horizonte).
 *
 * Contrato (alto nível)
 * - Entrada: preços instantâneos, médias de fluxo (instaBought/instaSold), churn (created orders),
 *   referências de preço (weighted 2% e médias de fecho), budget e horizonte (opcionais).
 * - Saída: score escalar (double >= 0), além de métricas explicativas (spread, spreadPct, risco).
 * - Monotonia desejada (ceteris paribus):
 *   • ↑ spread  ⇒ ↑ score
 *   • ↑ demanda/supply (flow) ⇒ ↑ score
 *   • ↑ churn (competição) ⇒ ↓ score
 *   • ↑ risco (desvio) ⇒ ↓ score
 *   • ↑ budget (até saturar escoamento) ⇒ ↑ score (sublinear via logs)
 *   • ↑ horizonte ⇒ ↑ score (até saturar pela procura)
 *
 * Definições dos termos (unidades entre parêntesis)
 * - instantBuyPrice (coins/u): menor sell order (custo de entrada via instabuy)
 * - instantSellPrice (coins/u): maior buy order (receita de saída via instasell)
 * - Para Buy Order → Sell Order: entrada ≈ instantSellPrice; saída ≈ instantBuyPrice
 * - spread = max(0, instantBuyPrice - instantSellPrice) (coins/u)
 * - spreadPct = spread / instantSellPrice (adimensional)
 * - avgInstaBought (u/h) ~ procura/h; avgInstaSold (u/h) ~ oferta/h
 * - flowAvg = avgInstaBought + avgInstaSold (u/h)
 * - throughputPerHour = min(avgInstaBought, avgInstaSold) (u/h)
 * - churnBuyAvg, churnSellAvg (ordens/h): ordens criadas; proxy de guerra/undercuts
 * - churn = churnBuyAvg + churnSellAvg (ordens/h)
 * - compPenalty = 1 + k_c * churn (adimensional; k_c pequeno p/ penalização suave)
 * - riskScore ∈ [0,1] (RiskToolkit): desvio relativo dos preços instantâneos vs referências
 * - riskAdj = 1 + k_r * riskScore (adimensional; k_r controla severidade)
 * - budget (coins): capital disponível; horizonHours (h): janela temporal considerada
 * - maxAffordable (u) = floor(budget / instantBuyPrice)
 * - maxThroughput (u) = floor(avgInstaBought * horizonHours)
 * - qty (u) = min(maxAffordable, maxThroughput) se budget>0; caso contrário ~ floor(min(demanda, supply))
 * - profitPerItem (coins/u) = spread * (1 - riskScore)
 * - totalProfit (coins) = profitPerItem * qty
 * - instasellRatio = (avgInstaBought + 1) / (avgInstaSold + 1) (cap 3.0) — evita divisão por zero e exageros
 * - beta base = log10(totalProfit + 1) * log10(profitPerItem + 1) * min(instasellRatio, 3)
 *             * (1 / log10(D + 1)), onde D = maxAffordable se budget>0, senão qty (suaviza escala)
 * - velocityBoost = ln(1 + avgInstaBought + avgInstaSold)
 * - compAdj = 1 / compPenalty
 * - score final = (beta * velocityBoost * compAdj) / riskAdj
 *
 * Passos do cálculo (score)
 * 1) Guard-rails: se instantBuyPrice <= 0, score=0; NaN/Inf são normalizados para 0.
 * 2) spread, spreadPct.
 * 3) flowAvg (velocidade) e churn (competição) ⇒ compPenalty.
 * 4) RiskToolkit.assessPriceDeviation ⇒ riskScore e riskAdj.
 * 5) Gating: se demanda ~0 e flow ~0, score=0 (evita outliers sem mercado).
 * 6) Capacidade: qty via budget/horizonte vs procura; sem budget, qty≈min(demanda, supply).
 * 7) profitPerItem e totalProfit ajustados a risco.
 * 8) instasellRatio capped.
 * 9) beta base com logs (sublinear; evita dominação por números gigantes).
 * 10) Ajustes: velocityBoost (mais fluxo ⇒ mais score), compAdj (mais competição ⇒ menos score).
 * 11) Penalização final por risco: dividir por riskAdj.
 * 12) Clamp final se não finito ou < 0 ⇒ 0.
 *
 * Razões de design
 * - churn (created*): mede dinamismo competitivo (undercuts) melhor que "active*" (estoque parado).
 * - logs: estabilizam valores extremos e promovem comparabilidade cross-item.
 * - ratio capado: evita favorecer artificialmente mercados unilaterais muito rasos.
 * - riskScore: protege contra regimes/manipulação (desvios grandes reduzem score).
 *
 * Edge cases tratados
 * - Preço inválido/zero ⇒ score=0.
 * - Demanda ~0 e flow ~0 ⇒ score=0 (mesmo com spread alto).
 * - Sem médias 48h: chamar atenção para fallback no serviço (buy/sellMovingWeek/168) para preencher demanda/supply.
 * - Budget ausente: qty proporcional ao ritmo (min(demanda, supply)) para priorizar eficiência por hora.
 * - Horizons muito grandes: ganha até saturar procura; logs evitam inflação exagerada.
 *
 * Calibração
 * - competitionCoeff (k_c) default 0.005; riskPenaltyCoeff (k_r) default 1.5.
 * - Ajuste-os por dados reais; objetivos: estabilidade de ranking e aderência a lucro/h executável.
 */
@Component
public class FlippingScorer {

    private final double competitionCoeff;   // sensibilidade à competição (churn)
    private final double riskPenaltyCoeff;   // intensidade da penalização por risco
    private final RiskToolkit riskToolkit;

    private final BazaarProductSnapshotRepository snapRepo;
    private final BazaarItemRepository itemRepo;
    private final FinanceMetricsService finance;

    // Liquidity shaping: penaliza mercados com throughput/h muito baixo (ex.: 1/h)
    private final double minThroughputFloor; // abaixo disso, peso ~0
    private final double goodThroughputRef;  // acima disso, peso ~1

    @Autowired
    public FlippingScorer(RiskToolkit riskToolkit,
                          BazaarProductSnapshotRepository snapRepo,
                          BazaarItemRepository itemRepo,
                          FinanceMetricsService finance) {
        this(riskToolkit, 0.005, 1.5, 5.0, 80.0, snapRepo, itemRepo, finance);
    }

    public FlippingScorer(RiskToolkit riskToolkit, double competitionCoeff, double riskPenaltyCoeff,
                          BazaarProductSnapshotRepository snapRepo,
                          BazaarItemRepository itemRepo,
                          FinanceMetricsService finance) {
        this(riskToolkit, competitionCoeff, riskPenaltyCoeff, 5.0, 80.0, snapRepo, itemRepo, finance);
    }

    public FlippingScorer(RiskToolkit riskToolkit,
                          double competitionCoeff,
                          double riskPenaltyCoeff,
                          double minThroughputFloor,
                          double goodThroughputRef,
                          BazaarProductSnapshotRepository snapRepo,
                          BazaarItemRepository itemRepo,
                          FinanceMetricsService finance) {
        this.riskToolkit = riskToolkit;
        this.competitionCoeff = competitionCoeff <= 0 ? 0.005 : competitionCoeff;
        this.riskPenaltyCoeff = riskPenaltyCoeff <= 0 ? 1.5 : riskPenaltyCoeff;
        this.minThroughputFloor = Math.max(0.0, minThroughputFloor);
        this.goodThroughputRef = Math.max(this.minThroughputFloor + 1.0, goodThroughputRef);
        this.snapRepo = snapRepo;
        this.itemRepo = itemRepo;
        this.finance = finance;
    }

    public record Inputs(
            double instantBuyPrice,
            double instantSellPrice,
            double flowAvg,              // avg(instaBought + instaSold)
            double churnBuyAvg,          // avg(createdBuy)
            double churnSellAvg,         // avg(createdSell)
            Double refWeightedBuy,
            Double refWeightedSell,
            Double refAvgCloseBuy,
            Double refAvgCloseSell,
            // para score com budget
            Double avgInstaBought,
            Double avgInstaSold,
            Double budget,
            Double horizonHours
    ) {}

    /**
     * Implementação do score (ver especificação acima).
     * Retorna:
     * - spread (coins/u)
     * - spreadPct (adimensional)
     * - riskScore ∈ [0,1]
     * - risky (booleano; sinal qualitativo)
     * - execução e lucro
     * - ETAs (h) para encher/vender a quantidade sugerida por hora
     * - score (eficiência final ≥ 0)
     */
    public record Score(
            double spread,
            double spreadPct,
            double riskScore,
            boolean risky,
            // execução e lucro
            double throughputPerHour,
            double plannedUnitsPerHour,
            double suggestedUnitsPerHour,
            double profitPerItem,
            double profitPerHour,
            double reasonableProfitPerHour,
            // ETAs (horas) para a quantidade sugerida
            Double suggestedBuyFillHours,
            Double suggestedSellFillHours,
            Double suggestedTotalFillHours,
            // score
            double score
    ) {}

    public Score score(Inputs in) {
        // Guard-rails básicos
        double ib = in.instantBuyPrice;
        double is = in.instantSellPrice;
        if (!Double.isFinite(ib) || !Double.isFinite(is) || ib <= 0 || is <= 0) {
            return new Score(0.0, 0.0, 0.0, false, 0.0,0.0,0.0,0.0,0.0,0.0, null,null,null, 0.0);
        }

        // Buy Order → Sell Order: spread = ask - bid = instantBuy - instantSell
        double spread = Math.max(0.0, ib - is);
        if (spread <= 0.0) {
            return new Score(0.0, 0.0, 0.0, false, 0.0,0.0,0.0,0.0,0.0,0.0, null,null,null, 0.0);
        }
        // % sobre o preço de entrada (buy order ≈ instantSell)
        double spreadPct = is > 0 ? (spread / is) : 0.0;

        double demandPerHour = nonNeg(in.avgInstaBought);
        double supplyPerHour = nonNeg(in.avgInstaSold);
        // double flowAvg = Double.isFinite(in.flowAvg) ? Math.max(0.0, in.flowAvg) : (demandPerHour + supplyPerHour); // não usado diretamente no score
        double throughputPerHour = Math.min(demandPerHour, supplyPerHour);

        double churnBuy = Math.max(0.0, in.churnBuyAvg);
        double churnSell = Math.max(0.0, in.churnSellAvg);
        double churn = churnBuy + churnSell;
        double compPenalty = 1.0 + (competitionCoeff * churn);

        // Risco vs referências
        RiskAssessment ra = riskToolkit.assessPriceDeviation(
                ib, is,
                in.refWeightedBuy, in.refWeightedSell,
                in.refAvgCloseBuy, in.refAvgCloseSell
        );
        double riskScore = clamp01(ra.riskScore());
        boolean risky = ra.manipulatedLikely();
        double riskAdj = 1.0 + (riskPenaltyCoeff * riskScore);

        // Gating de liquidez/mercado: precisa de throughput > 0
        if (throughputPerHour <= 0.0) {
            return new Score(spread, spreadPct, riskScore, risky, 0.0,0.0,0.0,0.0,0.0,0.0, null,null,null, 0.0);
        }

        // Capacidade via budget/horizonte (horizonHours como double; aceitar frações de hora)
        double budget = in.budget != null && Double.isFinite(in.budget) ? Math.max(0.0, in.budget) : 0.0;
        double horizon = in.horizonHours != null && Double.isFinite(in.horizonHours) && in.horizonHours > 0.0 ? in.horizonHours : 1.0;

        double qty;
        double D; // escala para logs
        if (budget > 0.0) {
            double maxAffordable = Math.floor(budget / is); // entrada real ≈ instantSell
            double maxThroughput = Math.floor(throughputPerHour * horizon);
            if (!Double.isFinite(maxThroughput)) maxThroughput = 0.0;
            qty = Math.max(0.0, Math.min(maxAffordable, maxThroughput));
            D = Math.max(1.0, maxAffordable);
        } else {
            // double base = throughputPerHour; // redundante
            qty = Math.max(0.0, Math.floor(throughputPerHour));
            D = Math.max(1.0, qty);
        }

        double plannedUnitsPerHour = qty / Math.max(1.0, horizon);

        // Lucro ajustado a risco
        double profitPerItem = Math.max(0.0, spread * (1.0 - riskScore));
        double profitPerHour = Math.max(0.0, profitPerItem * plannedUnitsPerHour);

        // Penalização por desequilíbrio: preferir supply >= demand para BO→SO
        double balanceAdj;
        if (demandPerHour <= 0.0 && supplyPerHour > 0.0) balanceAdj = 0.5; // saída incerta
        else if (supplyPerHour <= 0.0) balanceAdj = 0.0;
        else balanceAdj = Math.min(1.0, supplyPerHour / (demandPerHour + 1.0)); // ∈(0,1]

        // Suggested units: quota realizável considerando competição e equilíbrio
        double baseQuota = Math.min(plannedUnitsPerHour, throughputPerHour * balanceAdj);
        double suggestedUnitsPerHour = Math.max(0.0, baseQuota / Math.max(1e-6, compPenalty));
        double reasonableProfitPerHour = Math.max(0.0, profitPerItem * suggestedUnitsPerHour);

        // ETAs para a quantidade sugerida (em horas)
        Double suggestedBuyFillHours = null;
        Double suggestedSellFillHours = null;
        Double suggestedTotalFillHours = null;
        if (suggestedUnitsPerHour > 0.0) {
            suggestedBuyFillHours = (supplyPerHour > 0.0) ? (suggestedUnitsPerHour / supplyPerHour) : null;
            suggestedSellFillHours = (demandPerHour > 0.0) ? (suggestedUnitsPerHour / demandPerHour) : null;
            if (suggestedBuyFillHours != null && suggestedSellFillHours != null) {
                suggestedTotalFillHours = suggestedBuyFillHours + suggestedSellFillHours;
            }
        }

        // Liquidity weight: 0..1 suavizado, penaliza throughput baixo (ex.: 1/h)
        double wLiqu = 0.0;
        if (throughputPerHour > 0.0) {
            double num = throughputPerHour - minThroughputFloor;
            double den = Math.max(1e-9, goodThroughputRef - minThroughputFloor);
            wLiqu = clamp01(num / den);
            // acentua penalização para valores perto do piso
            wLiqu = wLiqu * wLiqu;
        }

        // Ajustes adicionais para balancear RPH com ETA total, competição e risco
        // ETA: quanto menor o total (comprar+vender), maior o multiplicador (tau define meia-vida)
        double etaAdj;
        if (suggestedTotalFillHours == null) {
            etaAdj = 1.0; // sem info, neutro
        } else {
            double tau = 2.0; // ~2h → 0.5x
            etaAdj = 1.0 / (1.0 + Math.max(0.0, suggestedTotalFillHours) / tau);
        }
        // Competição: já afeta suggestedUnitsPerHour; aplicar ajuste suave extra para desempates
        double compAdjSoft = Math.pow(1.0 / Math.max(1e-6, compPenalty), 0.5); // raiz para não dupla-penalizar forte

        // Score prioriza o lucro/h razoável, ponderado por ETA, competição e penalizado por risco
        double logRph = safeLog10(reasonableProfitPerHour + 1.0);
        double logPpi = safeLog10(profitPerItem + 1.0);
        double denomAdj = safeLog10(D + 1.0);
        double baseScore = (logRph * logPpi * denomAdj);
        // aplicar multiplicadores e divisores finais
        double score = (baseScore * etaAdj * compAdjSoft * wLiqu) / Math.max(1e-6, riskAdj);
        if (!Double.isFinite(score) || score < 0) score = 0.0;

        return new Score(
                spread,
                spreadPct,
                riskScore,
                risky,
                throughputPerHour,
                plannedUnitsPerHour,
                suggestedUnitsPerHour,
                profitPerItem,
                profitPerHour,
                reasonableProfitPerHour,
                suggestedBuyFillHours,
                suggestedSellFillHours,
                suggestedTotalFillHours,
                score
        );
    }

    @Transactional(readOnly = true)
    public List<FlipOpportunityResponseDTO> list(BazaarItemFilterDTO filter,
                                                 Double budget,
                                                 Double horizonHours) {
        // 1) Snapshots mais recentes conforme filtro
        List<BazaarItemSnapshot> snaps = snapRepo.searchLatest(
                filter.q(), filter.minSell(), filter.maxSell(),
                filter.minBuy(), filter.maxBuy(), filter.minSpread());
        if (snaps == null || snaps.isEmpty()) return List.of();

        // 2) Ids e nomes
        List<String> ids = snaps.stream().map(BazaarItemSnapshot::getProductId).toList();
        Map<String, String> names = preloadNames(new HashSet<>(ids));

        // 3) Médias financeiras (48h)
        Map<String, FinanceAverages> avgs = finance.getAveragesFor(ids, 48);

        // 4) Score item a item e construir resposta
        List<FlipOpportunityResponseDTO> out = new ArrayList<>(snaps.size());
        for (BazaarItemSnapshot s : snaps) {
            String id = s.getProductId();
            FinanceAverages avg = avgs.get(id);

            double ib = s.getInstantBuyPrice();
            double is = s.getInstantSellPrice();

            // Preferir insta metrics; fallback para |delta| por hora
            Double instaBought = (avg != null) ? avg.avgInstaBoughtItems() : null;
            Double instaSold   = (avg != null) ? avg.avgInstaSoldItems()   : null;
            Double deltaBuyAbs = (avg != null) ? Math.abs(avg.avgDeltaBuyOrders()) : null;
            Double deltaSellAbs= (avg != null) ? Math.abs(avg.avgDeltaSellOrders()) : null;

            Double demand = (instaBought != null && instaBought > 0) ? instaBought : deltaBuyAbs;
            Double supply = (instaSold   != null && instaSold   > 0) ? instaSold   : deltaSellAbs;

            double flowProxy = ((demand != null ? demand : 0.0) + (supply != null ? supply : 0.0));
            double churnBuy = avg != null ? avg.avgCreatedBuyOrders() : 0.0;
            double churnSell = avg != null ? avg.avgCreatedSellOrders() : 0.0;

            Inputs in = new Inputs(
                    ib,
                    is,
                    flowProxy,
                    churnBuy,
                    churnSell,
                    s.getWeightedTwoPercentBuyPrice(),
                    s.getWeightedTwoPercentSellPrice(),
                    avg != null ? avg.avgCloseInstantBuy() : null,
                    avg != null ? avg.avgCloseInstantSell() : null,
                    demand,
                    supply,
                    budget,
                    horizonHours
            );

            Score sc = score(in);

            double spread = sc.spread();
            double spreadPct = sc.spreadPct();
            Double compPerHour = avg != null ? (avg.avgCreatedBuyOrders() + avg.avgCreatedSellOrders()) : null;

            // construir resposta com todos os campos
            out.add(new FlipOpportunityResponseDTO(
                    id,
                    names.getOrDefault(id, id),
                    ib,
                    is,
                    // order-book claros para BO→SO
                    is, // buyOrderPrice = topo dos compradores (instantSell)
                    ib, // sellOrderPrice = topo dos vendedores (instantBuy)
                    spread,
                    spreadPct,
                    demand,
                    supply,
                    compPerHour,
                    sc.throughputPerHour(),
                    sc.plannedUnitsPerHour(),
                    sc.suggestedUnitsPerHour(),
                    sc.profitPerItem(),
                    sc.profitPerHour(),
                    sc.reasonableProfitPerHour(),
                    // novas estimativas de tempo
                    sc.suggestedBuyFillHours(),
                    sc.suggestedSellFillHours(),
                    sc.suggestedTotalFillHours(),
                    sc.riskScore(),
                    sc.risky(),
                    sc.score()
            ));
        }

        // 5) Ordenar por score desc
        out.sort(Comparator.comparingDouble(FlipOpportunityResponseDTO::score).reversed());
        return out;
    }

    private Map<String, String> preloadNames(Set<String> ids) {
        return itemRepo.findAllByProductIdIn(ids).stream()
                .filter(bi -> bi.getSkyblockItem() != null)
                .collect(Collectors.toMap(
                        BazaarItem::getProductId,
                        bi -> bi.getSkyblockItem().getName()
                ));
    }

    private static double nonNeg(Double v) { return (v != null && Double.isFinite(v) && v > 0) ? v : 0.0; }
    private static double clamp(double x, double lo, double hi) { return Math.max(lo, Math.min(hi, x)); }
    private static double clamp01(double x) { return clamp(x, 0.0, 1.0); }
    private static double safeLog10(double x) { return Math.log10(Math.max(1e-9, x)); }
}
