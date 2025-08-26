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
 * FlippingScorer — score simplificado de eficiência para Bazaar Flipping.
 *
 * Objetivo
 * - Rankear oportunidades que maximizam lucro por hora, com ajustes leves por risco e competição.
 * - Priorizar itens com alto lucro por hora, penalizando levemente itens arriscados ou competitivos.
 *
 * Contrato (alto nível)
 * - Entrada: preços instantâneos, médias de fluxo, referências de preço, budget e horizonte (opcionais).
 * - Saída: score escalar (double >= 0) baseado principalmente no lucro por hora.
 * - Monotonia desejada (ceteris paribus):
 *   • ↑ lucro/hora ⇒ ↑ score (principalmente via log scaling)
 *   • ↑ spread % ⇒ ↑ score (bônus secundário)
 *   • ↑ risco ⇒ ↓ score (penalização moderada)
 *   • ↑ competição ⇒ ↓ score (penalização leve)
 *   • ↓ liquidez ⇒ ↓ score (fator multiplicativo)
 *
 * Fórmula simplificada - BACK TO BASICS
 * 1. profitScore = log10(profitPerHour + 1) - DOMINANT FACTOR
 * 2. spreadBonus = min(0.8, spreadPct * 12) - moderate bonus (cap ~6.7% spread)
 * 3. baseScore = profitScore * (1 + spreadBonus)
 * 4. riskPenalty = riskScore * 0.1 (or 0 if disabled) - very light penalty (max 10% reduction)
 * 5. competitionPenalty = min(0.05, churn * 0.0005) (or 0 if disabled) - very light penalty
 * 6. liquidityFactor = min(1.0, throughputPerHour / 8.0) - need 8 units/hour minimum
 * 7. finalScore = baseScore * (1 - riskPenalty) * (1 - competitionPenalty) * liquidityFactor
 *
 * Scoring Toggles:
 * - disableRiskPenalties: Completely removes risk penalty from calculation
 * - disableCompetitionPenalties: Completely removes competition penalty from calculation
 * - These allow seeing raw profit potential without risk/competition considerations
 *
 * Razões de design
 * - Simplicidade: foco no que realmente importa - lucro por hora
 * - Log scaling: distribui scores de forma mais equilibrada
 * - Penalizações leves: não mata oportunidades boas com competição ou risco moderado
 * - Liquidez mínima: evita itens com volume muito baixo
 *
 * Edge cases tratados
 * - Preço inválido/zero ⇒ score=0
 * - Throughput < 1 u/h ⇒ score=0
 * - Valores não finitos ⇒ score=0
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
     * Implementação do score simplificado.
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
            String riskNote,
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
        return scoreWithToggles(in, Boolean.FALSE, Boolean.FALSE);
    }

    public Score scoreWithToggles(Inputs in, Boolean disableRiskPenalties, Boolean disableCompetitionPenalties) {
        // Guard-rails básicos
        double ib = in.instantBuyPrice;
        double is = in.instantSellPrice;
        if (!Double.isFinite(ib) || !Double.isFinite(is) || ib <= 0 || is <= 0) {
            return new Score(0.0, 0.0, 0.0, false, null, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, null, null, null, 0.0);
        }

        // Buy Order → Sell Order: spread = ask - bid = instantBuy - instantSell
        double spread = Math.max(0.0, ib - is);
        if (spread <= 0.0) {
            return new Score(0.0, 0.0, 0.0, false, null, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, null, null, null, 0.0);
        }
        // % sobre o preço de entrada (buy order ≈ instantSell)
        double spreadPct = is > 0 ? (spread / is) : 0.0;

        double demandPerHour = nonNeg(in.avgInstaBought);
        double supplyPerHour = nonNeg(in.avgInstaSold);
        double throughputPerHour = Math.min(demandPerHour, supplyPerHour);

        double churnBuy = Math.max(0.0, in.churnBuyAvg);
        double churnSell = Math.max(0.0, in.churnSellAvg);
        double churn = churnBuy + churnSell; // mantido se precisar diagnosticar
        // Novo: considerar lado dominante e desequilíbrio
        double churnMax = Math.max(churnBuy, churnSell);
        double churnMin = Math.min(churnBuy, churnSell);
        double imbalance = churnMax - churnMin;
        double imbalanceFactor = churnMax > 0 ? (imbalance / (churnMax + 1.0)) : 0.0; // ∈ [0, ~1)
        double effectiveChurn = churnMax * (1.0 + 0.5 * imbalanceFactor); // amplifica se forte desequilíbrio

        // Risco vs referências
        RiskAssessment ra = riskToolkit.assessPriceDeviation(
                ib, is,
                in.refWeightedBuy, in.refWeightedSell,
                in.refAvgCloseBuy, in.refAvgCloseSell
        );
        double riskScore = clamp01(ra.riskScore());
        boolean risky = ra.manipulatedLikely();
        String riskNote = ra.note();

        // Gating de liquidez/mercado: precisa de throughput mínimo
        if (throughputPerHour < 1.0) {
            return new Score(spread, spreadPct, riskScore, risky, riskNote, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, null, null, null, 0.0);
        }

        // Capacidade via budget/horizonte
        double budget = in.budget != null && Double.isFinite(in.budget) ? Math.max(0.0, in.budget) : 0.0;
        double horizon = in.horizonHours != null && Double.isFinite(in.horizonHours) && in.horizonHours > 0.0 ? in.horizonHours : 1.0;

        // Calculate how many units we can trade per hour (independent of horizon)
        double unitsPerHour;
        if (budget > 0.0) {
            double maxAffordablePerHour = Math.floor(budget / (is * horizon));
            double maxThroughputPerHour = throughputPerHour;
            if (!Double.isFinite(maxThroughputPerHour)) maxThroughputPerHour = 0.0;
            unitsPerHour = Math.max(0.0, Math.min(maxAffordablePerHour, maxThroughputPerHour));
        } else {
            unitsPerHour = Math.max(0.0, throughputPerHour);
        }

        // Total quantity we can trade over the entire horizon
        double totalQty = unitsPerHour * horizon;
        double plannedUnitsPerHour = unitsPerHour;
        double profitPerItem = Math.max(0.0, spread * (1.0 - riskScore));
        double profitPerHour = Math.max(0.0, profitPerItem * plannedUnitsPerHour);

        // Balance adjustment: prefer supply >= demand
        double balanceAdj;
        if (demandPerHour <= 0.0 && supplyPerHour > 0.0) balanceAdj = 0.5;
        else if (supplyPerHour <= 0.0) balanceAdj = 0.0;
        else balanceAdj = Math.min(1.0, supplyPerHour / (demandPerHour + 1.0));

        // Suggested units considering competition and balance
        double compPenalty = 1.0 + (competitionCoeff * effectiveChurn);
        // Base quota should consider the total capacity over the horizon
        double totalThroughputCapacity = throughputPerHour * horizon * balanceAdj;
        double baseQuota = Math.min(totalQty, totalThroughputCapacity);
        double suggestedUnitsPerHour = Math.max(0.0, baseQuota / (horizon * Math.max(1e-6, compPenalty)));
        double reasonableProfitPerHour = Math.max(0.0, profitPerItem * suggestedUnitsPerHour);

        // ETAs para a quantidade sugerida (em horas)
        Double suggestedBuyFillHours = null;
        Double suggestedSellFillHours = null;
        Double suggestedTotalFillHours = null;
        if (suggestedUnitsPerHour > 0.0) {
            // Calculate time to fill the total quantity, not just per hour
            double totalSuggestedUnits = suggestedUnitsPerHour * horizon;
            suggestedBuyFillHours = (supplyPerHour > 0.0) ? (totalSuggestedUnits / supplyPerHour) : null;
            suggestedSellFillHours = (demandPerHour > 0.0) ? (totalSuggestedUnits / demandPerHour) : null;
            if (suggestedBuyFillHours != null && suggestedSellFillHours != null) {
                suggestedTotalFillHours = Math.max(suggestedBuyFillHours, suggestedSellFillHours);
            } else if (suggestedBuyFillHours != null) {
                suggestedTotalFillHours = suggestedBuyFillHours;
            } else if (suggestedSellFillHours != null) {
                suggestedTotalFillHours = suggestedSellFillHours;
            }
        }

        // SIMPLIFIED SCORING FORMULA - BACK TO BASICS
        // 1. Primary factor: profit per hour (log scaled for better distribution)
        double profitScore = safeLog10(reasonableProfitPerHour + 1.0);

        // 2. Secondary factor: spread percentage (moderate bonus)
        double spreadBonus = Math.min(0.8, spreadPct * 12.0); // Cap at 0.8 for ~6.7% spread

        // 3. Risk penalty: can be disabled entirely
        double riskPenalty = Boolean.TRUE.equals(disableRiskPenalties) ? 0.0 : (riskScore * 0.1); // Max 10% reduction, or 0 if disabled

        // 4. Competition penalty: can be disabled entirely
        double competitionPenalty = Boolean.TRUE.equals(disableCompetitionPenalties) ? 0.0 : Math.min(0.10, effectiveChurn * 0.0007); // mais sensível ao lado dominante

        // 5. Liquidity factor: simple minimum requirement
        double liquidityFactor = Math.min(1.0, throughputPerHour / 8.0); // Need 8 units/hour minimum

        // Calculate final score - profit dominates, others are minor adjustments
        double baseScore = profitScore * (1.0 + spreadBonus);
        double adjustedScore = baseScore * (1.0 - riskPenalty) * (1.0 - competitionPenalty) * liquidityFactor;

        // Ensure score is finite and non-negative
        double finalScore = Double.isFinite(adjustedScore) && adjustedScore > 0 ? adjustedScore : 0.0;

        return new Score(
                spread,
                spreadPct,
                riskScore,
                risky,
                riskNote,
                throughputPerHour,
                plannedUnitsPerHour,
                suggestedUnitsPerHour,
                profitPerItem,
                profitPerHour,
                reasonableProfitPerHour,
                suggestedBuyFillHours,
                suggestedSellFillHours,
                suggestedTotalFillHours,
                finalScore
        );
    }

    @Transactional(readOnly = true)
    public List<FlipOpportunityResponseDTO> list(BazaarItemFilterDTO filter,
                                                 Double budget,
                                                 Double horizonHours) {
        return listWithAdvancedFilters(filter, budget, horizonHours, null, null, null, null, null, false, false);
    }

    @Transactional(readOnly = true)
    public List<FlipOpportunityResponseDTO> listWithAdvancedFilters(BazaarItemFilterDTO filter,
                                                                     Double budget,
                                                                     Double horizonHours,
                                                                     Double maxTime,
                                                                     Double minUnitsPerHour,
                                                                     Double maxUnitsPerHour,
                                                                     Double maxCompetitionPerHour,
                                                                     Double maxRiskScore,
                                                                     Boolean disableCompetitionPenalties,
                                                                     Boolean disableRiskPenalties) {
        // 1) Snapshots mais recentes conforme filtro
        List<BazaarItemSnapshot> snaps = snapRepo.searchLatest(
                filter.q(), filter.minSell(), filter.maxSell(),
                filter.minBuy(), filter.maxBuy(), filter.minSpread());
        if (snaps == null || snaps.isEmpty()) return List.of();

        // 2) Ids e nomes (ordenar ids para chave de cache estável em camadas superiores)
        List<String> ids = snaps.stream().map(BazaarItemSnapshot::getProductId).distinct().sorted().toList();
        Map<String, String> names = preloadNames(new HashSet<>(ids));

        // 3) Médias multi-janelas em UMA única query bulk (cacheável em FinanceMetricsService)
        Map<Integer, Map<String, FinanceAverages>> multi = finance.getMultiWindowAverages(ids, 48, 6, 1);
        Map<String, FinanceAverages> avgs48 = multi.getOrDefault(48, Map.of());
        Map<String, FinanceAverages> avgs06 = multi.getOrDefault(6, Map.of());
        Map<String, FinanceAverages> avgs01 = multi.getOrDefault(1, Map.of());

        final boolean disableComp = Boolean.TRUE.equals(disableCompetitionPenalties);
        final boolean disableRisk = Boolean.TRUE.equals(disableRiskPenalties);
        final double fMaxTime = maxTime != null ? maxTime : Double.POSITIVE_INFINITY;
        final double fMinUnits = minUnitsPerHour != null ? minUnitsPerHour : Double.NEGATIVE_INFINITY;
        final double fMaxUnits = maxUnitsPerHour != null ? maxUnitsPerHour : Double.POSITIVE_INFINITY;
        final double fMaxComp  = maxCompetitionPerHour != null ? maxCompetitionPerHour : Double.POSITIVE_INFINITY;
        final double fMaxRisk  = maxRiskScore != null ? maxRiskScore : Double.POSITIVE_INFINITY;

        // 4) Score item a item com early-filter; usar parallel se nº itens grande
        boolean useParallel = snaps.size() >= 128; // threshold heurístico
        var stream = useParallel ? snaps.parallelStream() : snaps.stream();

        List<FlipOpportunityResponseDTO> out = stream.map(s -> {
            String id = s.getProductId();
            FinanceAverages a48 = avgs48.get(id);
            FinanceAverages a06 = avgs06.get(id);
            FinanceAverages a01 = avgs01.get(id);

            double ib = s.getInstantBuyPrice();
            double is = s.getInstantSellPrice();

            Double d48 = a48 != null && a48.avgInstaBoughtItems() > 0 ? a48.avgInstaBoughtItems() : (a48 != null ? Math.abs(a48.avgDeltaBuyOrders()) : null);
            Double s48 = a48 != null && a48.avgInstaSoldItems()   > 0 ? a48.avgInstaSoldItems()   : (a48 != null ? Math.abs(a48.avgDeltaSellOrders()) : null);
            Double d06 = a06 != null && a06.avgInstaBoughtItems() > 0 ? a06.avgInstaBoughtItems() : (a06 != null ? Math.abs(a06.avgDeltaBuyOrders()) : null);
            Double s06 = a06 != null && a06.avgInstaSoldItems()   > 0 ? a06.avgInstaSoldItems()   : (a06 != null ? Math.abs(a06.avgDeltaSellOrders()) : null);
            Double d01 = a01 != null && a01.avgInstaBoughtItems() > 0 ? a01.avgInstaBoughtItems() : (a01 != null ? Math.abs(a01.avgDeltaBuyOrders()) : null);
            Double s01 = a01 != null && a01.avgInstaSoldItems()   > 0 ? a01.avgInstaSoldItems()   : (a01 != null ? Math.abs(a01.avgDeltaSellOrders()) : null);

            Double demand = minPos(d48, d06, d01);
            Double supply = minPos(s48, s06, s01);
            double flowProxy = ((demand != null ? demand : 0.0) + (supply != null ? supply : 0.0));
            double churnBuy = a48 != null ? a48.avgCreatedBuyOrders() : 0.0;
            double churnSell = a48 != null ? a48.avgCreatedSellOrders() : 0.0;

            Inputs in = new Inputs(
                    ib,
                    is,
                    flowProxy,
                    churnBuy,
                    churnSell,
                    s.getWeightedTwoPercentBuyPrice(),
                    s.getWeightedTwoPercentSellPrice(),
                    a48 != null ? a48.avgCloseInstantBuy() : null,
                    a48 != null ? a48.avgCloseInstantSell() : null,
                    demand,
                    supply,
                    budget,
                    horizonHours
            );

            Score sc = scoreWithToggles(in, disableRisk, disableComp);

            // Early rejection com base nos filtros avançados (evita construir DTO desnecessário)
            if (sc.suggestedTotalFillHours() != null && sc.suggestedTotalFillHours() > fMaxTime) return null;
            if (sc.suggestedUnitsPerHour() > 0) {
                if (sc.suggestedUnitsPerHour() < fMinUnits) return null;
                if (sc.suggestedUnitsPerHour() > fMaxUnits) return null;
            }
            double compPerHour = (a48 != null ? (a48.avgCreatedBuyOrders() + a48.avgCreatedSellOrders()) : 0.0);
            if (compPerHour > fMaxComp) return null;
            if (sc.riskScore() > fMaxRisk) return null;

            return new FlipOpportunityResponseDTO(
                    id,
                    names.getOrDefault(id, id),
                    ib,
                    is,
                    is,
                    ib,
                    sc.spread(),
                    sc.spreadPct(),
                    demand,
                    supply,
                    compPerHour,
                    sc.throughputPerHour(),
                    sc.plannedUnitsPerHour(),
                    sc.suggestedUnitsPerHour(),
                    sc.profitPerItem(),
                    sc.profitPerHour(),
                    sc.reasonableProfitPerHour(),
                    sc.suggestedBuyFillHours(),
                    sc.suggestedSellFillHours(),
                    sc.suggestedTotalFillHours(),
                    sc.riskScore(),
                    sc.risky(),
                    sc.riskNote(),
                    sc.score()
            );
        }).filter(Objects::nonNull)
          .collect(Collectors.toCollection(() -> new ArrayList<>(snaps.size())));

        // 5) Ordenar por score desc
        out.sort(Comparator.comparingDouble(FlipOpportunityResponseDTO::score).reversed());
        return out;
    }

    private List<FlipOpportunityResponseDTO> applyAdvancedFilters(
            List<FlipOpportunityResponseDTO> opportunities,
            Double maxTime,
            Double minUnitsPerHour,
            Double maxUnitsPerHour,
            Double maxCompetitionPerHour,
            Double maxRiskScore) {

        return opportunities.stream()
                .filter(opp -> {
                    // Filter by maximum total time
                    if (maxTime != null && opp.suggestedTotalFillHours() != null) {
                        if (opp.suggestedTotalFillHours() > maxTime) return false;
                    }

                    // Filter by minimum units per hour
                    if (minUnitsPerHour != null && opp.suggestedUnitsPerHour() != null) {
                        if (opp.suggestedUnitsPerHour() < minUnitsPerHour) return false;
                    }

                    // Filter by maximum units per hour
                    if (maxUnitsPerHour != null && opp.suggestedUnitsPerHour() != null) {
                        if (opp.suggestedUnitsPerHour() > maxUnitsPerHour) return false;
                    }

                    // Filter by maximum competition per hour
                    if (maxCompetitionPerHour != null && opp.competitionPerHour() != null) {
                        if (opp.competitionPerHour() > maxCompetitionPerHour) return false;
                    }

                    // Filter by maximum risk score
                    if (maxRiskScore != null && opp.riskScore() != null) {
                        if (opp.riskScore() > maxRiskScore) return false;
                    }

                    return true;
                })
                .collect(Collectors.toList());
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
    private static Double minPos(Double... vals) {
        Double out = null;
        for (Double v : vals) {
            if (v != null && Double.isFinite(v) && v > 0) {
                out = (out == null) ? v : Math.min(out, v);
            }
        }
        return out;
    }
}
