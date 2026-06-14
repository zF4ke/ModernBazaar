package com.modernbazaar.core.strategy.manipulation;

import com.modernbazaar.core.api.dto.BazaarItemFilterDTO;
import com.modernbazaar.core.api.dto.ManipulationOpportunityResponseDTO;
import com.modernbazaar.core.domain.BazaarItem;
import com.modernbazaar.core.domain.BazaarItemSnapshot;
import com.modernbazaar.core.repository.BazaarItemRepository;
import com.modernbazaar.core.repository.BazaarProductSnapshotRepository;
import com.modernbazaar.core.repository.projection.SellSideAggregateRow;
import com.modernbazaar.core.strategy.BazaarConstants;
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
 * ManipulationScorer — ranks "corner the market" opportunities for Bazaar Manipulation.
 *
 * Idea (high level)
 * - Find items with THIN supply and STRONG demand that are cheap enough to buy out
 *   entirely within a budget, so the manipulator can set the price.
 * - For each candidate, build the full plan:
 *   1. Cost to insta-buy every standing sell offer (corner the market).
 *   2. Average cost per cornered unit, and the break-even resell price after the
 *      bazaar tax (1.125%): minResell = avgBuyCost / (1 - tax).
 *   3. A very-high sell wall (lure) and an inflated buy order at {@code roi * minResell}.
 *   4. How many times the current top bid must double to reach that inflated buy order.
 *   5. Expected profit once other players outbid the inflated buy order, and how long
 *      it takes to offload the whole stock given hourly demand.
 *
 * The core math lives in the pure {@link #plan(Inputs)} method (no I/O) so it is unit
 * testable; {@link #list} only loads data and assembles DTOs.
 *
 * Score (transparent, profit-dominant)
 * - profitScore   = log10(totalProfit + 1)            — dominant
 * - ratioFactor   = clamp(demandSupplyRatio / 2, 0, 1.5)
 * - score         = profitScore * (0.5 + ratioFactor)
 * - Gated to 0 when: invalid prices, no cornerable supply, no demand, or non-positive profit.
 */
@Component
public class ManipulationScorer {

    /** demandSupplyRatio is capped here to avoid runaway values when supply ≈ 0. */
    private static final double MAX_RATIO = 5.0;

    private final RiskToolkit riskToolkit;
    private final BazaarProductSnapshotRepository snapRepo;
    private final BazaarItemRepository itemRepo;
    private final FinanceMetricsService finance;

    @Autowired
    public ManipulationScorer(RiskToolkit riskToolkit,
                              BazaarProductSnapshotRepository snapRepo,
                              BazaarItemRepository itemRepo,
                              FinanceMetricsService finance) {
        this.riskToolkit = riskToolkit;
        this.snapRepo = snapRepo;
        this.itemRepo = itemRepo;
        this.finance = finance;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Pure planning core (no I/O — unit testable)
    // ─────────────────────────────────────────────────────────────────────────

    public record Inputs(
            double instantBuyPrice,    // lowest sell order (cost to insta-buy a unit)
            double instantSellPrice,   // highest buy order (current top bid)
            long   cornerSupplyUnits,  // visible standing sell units
            double cornerCost,         // coins to insta-buy all sell offers
            double demandPerHour,      // avg units insta-bought / hour
            double supplyPerHour,      // avg units insta-sold / hour
            double taxRate,            // selling tax, e.g. 0.01125
            double roi,                // buy-order inflation vs minResell (>= 1)
            double sellWallFactor      // sell order = targetBuyOrder * factor (> 1)
    ) {}

    public record Plan(
            double avgBuyCostPerUnit,
            double minResellPrice,
            double targetBuyOrderPrice,
            double suggestedSellOrderPrice,
            int    buyOrderDoublingSteps,
            double netProfitPerUnit,
            double totalProfit,
            double demandSupplyRatio,
            Double estimatedSellThroughHours,
            double score
    ) {}

    private static final Plan ZERO_PLAN =
            new Plan(0, 0, 0, 0, 0, 0, 0, 0, null, 0.0);

    /**
     * Builds the manipulation plan from market inputs. Pure function (no I/O).
     */
    public Plan plan(Inputs in) {
        double ib = in.instantBuyPrice;
        long supplyUnits = in.cornerSupplyUnits;
        double cornerCost = in.cornerCost;

        if (!Double.isFinite(ib) || ib <= 0 || supplyUnits <= 0
                || !Double.isFinite(cornerCost) || cornerCost <= 0) {
            return ZERO_PLAN;
        }

        double tax = (Double.isFinite(in.taxRate) && in.taxRate >= 0 && in.taxRate < 0.5)
                ? in.taxRate : BazaarConstants.DEFAULT_BAZAAR_TAX_RATE;
        double roi = (Double.isFinite(in.roi) && in.roi >= 1.0) ? in.roi : BazaarConstants.DEFAULT_MANIPULATION_ROI;
        double wall = (Double.isFinite(in.sellWallFactor) && in.sellWallFactor > 1.0)
                ? in.sellWallFactor : BazaarConstants.DEFAULT_SELL_WALL_FACTOR;

        double avgBuyCost = cornerCost / supplyUnits;
        double minResell = avgBuyCost / (1.0 - tax);          // break-even net of tax
        double targetBuyOrder = minResell * roi;              // inflated buy order we place
        double suggestedSellOrder = targetBuyOrder * wall;    // visible lure wall above it

        // Number of times we must double the current top bid to reach our inflated buy order.
        double currentBid = (Double.isFinite(in.instantSellPrice) && in.instantSellPrice > 0)
                ? in.instantSellPrice : avgBuyCost;
        int doublings = 0;
        if (targetBuyOrder > currentBid && currentBid > 0) {
            doublings = (int) Math.ceil(log2(targetBuyOrder / currentBid));
        }

        double netProfitPerUnit = targetBuyOrder * (1.0 - tax) - avgBuyCost;
        double totalProfit = netProfitPerUnit * supplyUnits;

        double demand = nonNeg(in.demandPerHour);
        double supply = nonNeg(in.supplyPerHour);
        double ratio = supply > 0 ? Math.min(MAX_RATIO, demand / supply)
                : (demand > 0 ? MAX_RATIO : 0.0);

        Double sellThroughHours = demand > 0 ? (supplyUnits / demand) : null;

        // Gating: needs real buyers to dump onto and a positive expected profit.
        double score;
        if (demand <= 0 || totalProfit <= 0) {
            score = 0.0;
        } else {
            double profitScore = safeLog10(totalProfit + 1.0);
            double ratioFactor = clamp(ratio / 2.0, 0.0, 1.5);
            double s = profitScore * (0.5 + ratioFactor);
            score = Double.isFinite(s) && s > 0 ? s : 0.0;
        }

        return new Plan(avgBuyCost, minResell, targetBuyOrder, suggestedSellOrder,
                doublings, netProfitPerUnit, totalProfit, ratio, sellThroughHours, score);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Data loading + DTO assembly
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ManipulationOpportunityResponseDTO> list(BazaarItemFilterDTO filter,
                                                         Double budget,
                                                         Double roi,
                                                         Double taxRate,
                                                         Double sellWallFactor,
                                                         Double minDemandSupplyRatio,
                                                         Double minProfit) {
        List<BazaarItemSnapshot> snaps = snapRepo.searchLatest(
                filter.q(), filter.minSell(), filter.maxSell(),
                filter.minBuy(), filter.maxBuy(), filter.minSpread());
        if (snaps == null || snaps.isEmpty()) return List.of();

        List<String> ids = snaps.stream().map(BazaarItemSnapshot::getProductId).distinct().sorted().toList();
        Map<String, String> names = preloadNames(new HashSet<>(ids));
        Map<String, SellSideAggregateRow> sellAgg = snapRepo.aggregateLatestSellSide(ids).stream()
                .collect(Collectors.toMap(SellSideAggregateRow::getProductId, r -> r, (a, b) -> a));
        Map<String, FinanceAverages> avgs48 = finance.getAveragesFor(ids, 48);

        final double effTax  = taxRate != null ? taxRate : BazaarConstants.DEFAULT_BAZAAR_TAX_RATE;
        final double effRoi  = roi != null ? roi : BazaarConstants.DEFAULT_MANIPULATION_ROI;
        final double effWall = sellWallFactor != null ? sellWallFactor : BazaarConstants.DEFAULT_SELL_WALL_FACTOR;
        final double fBudget = budget != null ? budget : Double.POSITIVE_INFINITY;
        final double fMinRatio = minDemandSupplyRatio != null ? minDemandSupplyRatio : Double.NEGATIVE_INFINITY;
        final double fMinProfit = minProfit != null ? minProfit : Double.NEGATIVE_INFINITY;

        List<ManipulationOpportunityResponseDTO> out = new ArrayList<>(snaps.size());
        for (BazaarItemSnapshot s : snaps) {
            String id = s.getProductId();
            SellSideAggregateRow agg = sellAgg.get(id);
            if (agg == null || agg.getUnits() <= 0 || agg.getCost() <= 0) continue; // nothing to corner

            // Budget gate: we must be able to buy the whole visible market.
            if (agg.getCost() > fBudget) continue;

            FinanceAverages a = avgs48.get(id);
            double demand = a != null ? a.avgInstaBoughtItems() : 0.0;
            double supply = a != null ? a.avgInstaSoldItems() : 0.0;

            Inputs in = new Inputs(
                    s.getInstantBuyPrice(),
                    s.getInstantSellPrice(),
                    agg.getUnits(),
                    agg.getCost(),
                    demand,
                    supply,
                    effTax,
                    effRoi,
                    effWall);
            Plan p = plan(in);
            if (p.score() <= 0.0) continue;

            if (p.demandSupplyRatio() < fMinRatio) continue;
            if (p.totalProfit() < fMinProfit) continue;

            RiskAssessment ra = riskToolkit.assessPriceDeviation(
                    s.getInstantBuyPrice(), s.getInstantSellPrice(),
                    s.getWeightedTwoPercentBuyPrice(), s.getWeightedTwoPercentSellPrice(),
                    a != null ? a.avgCloseInstantBuy() : null,
                    a != null ? a.avgCloseInstantSell() : null);

            out.add(new ManipulationOpportunityResponseDTO(
                    id,
                    names.getOrDefault(id, id),
                    s.getInstantBuyPrice(),
                    s.getInstantSellPrice(),
                    s.getInstantSellPrice(),
                    agg.getUnits(),
                    agg.getCost(),
                    p.avgBuyCostPerUnit(),
                    effTax,
                    p.minResellPrice(),
                    effRoi,
                    p.targetBuyOrderPrice(),
                    p.suggestedSellOrderPrice(),
                    p.buyOrderDoublingSteps(),
                    demand > 0 ? demand : null,
                    supply > 0 ? supply : null,
                    p.demandSupplyRatio(),
                    s.getActiveSellOrdersCount(),
                    s.getActiveBuyOrdersCount(),
                    p.netProfitPerUnit(),
                    p.totalProfit(),
                    p.estimatedSellThroughHours(),
                    ra.manipulatedLikely(),
                    ra.note(),
                    p.score()));
        }

        out.sort(Comparator.comparingDouble(ManipulationOpportunityResponseDTO::score).reversed());
        return out;
    }

    private Map<String, String> preloadNames(Set<String> ids) {
        return itemRepo.findAllByProductIdIn(ids).stream()
                .filter(bi -> bi.getSkyblockItem() != null)
                .collect(Collectors.toMap(BazaarItem::getProductId, bi -> bi.getSkyblockItem().getName()));
    }

    private static double nonNeg(double v) { return (Double.isFinite(v) && v > 0) ? v : 0.0; }
    private static double clamp(double x, double lo, double hi) { return Math.max(lo, Math.min(hi, x)); }
    private static double safeLog10(double x) { return Math.log10(Math.max(1e-9, x)); }
    private static double log2(double x) { return Math.log(x) / Math.log(2.0); }
}
