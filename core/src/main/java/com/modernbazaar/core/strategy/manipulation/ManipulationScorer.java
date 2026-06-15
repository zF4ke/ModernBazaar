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
 * Score (transparent, profit discounted by how realistic the play actually is)
 * - profitScore    = log10(totalProfit + 1)                  — the prize, compressed
 * - demandQuality  = throughput(demand) * (0.5 + 0.5*imbalance) — can you actually offload?
 * - realism        = exp(-doublings / DECAY)                 — is the bid-climb believable?
 * - manipPenalty   = 1 - W*riskScore                         — is it already manipulated?
 * - score          = profitScore * demandQuality * realism * manipPenalty
 *
 * The factors are multiplicative so any single fatal flaw collapses the score: a fat
 * paper profit on an item with no real buyers, an absurd price-climb, or an already
 * spiked/atypical price no longer ranks #1.
 *
 * Hard-gated to 0 when: invalid prices, no cornerable supply, non-positive profit,
 * demand below {@link #MIN_DEMAND_PER_HOUR} (can't offload), more than
 * {@link #MAX_DOUBLINGS} bid-doublings (fantasy climb), riskScore at/above
 * {@link #MAX_RISK_SCORE} (already manipulated), or sell-through beyond
 * {@link #MAX_SELL_THROUGH_HOURS} (capital tied up too long).
 *
 * Not yet modelled (needs data we don't currently have): NPC-shop-buyable items
 * (infinite supply at a fixed price → uncornerable) and craftable/mergeable items
 * (an alternative supply that caps the price). See {@code npcSellPrice} on
 * SkyblockItem — it's a sell-to-NPC price, NOT a shop-buyable flag, so it can't
 * stand in for either. Tracked as a follow-up.
 */
@Component
public class ManipulationScorer {

    /** demandSupplyRatio is capped here to avoid runaway values when supply ≈ 0. */
    private static final double MAX_RATIO = 5.0;

    // ── Scoring tunables ─────────────────────────────────────────────────────
    /** Absolute demand floor: below this many insta-buys/hour you can't reliably
     *  offload the cornered stock, so the play is gated out regardless of paper profit. */
    private static final double MIN_DEMAND_PER_HOUR = 1.0;
    /** Demand at which the throughput factor reaches 0.5 (saturating, never hard-capped). */
    private static final double DEMAND_HALF_SAT = 10.0;
    /** demand/supply imbalance that counts as "fully supply-starved" for the bonus. */
    private static final double RATIO_REFERENCE = 2.0;
    /** Beyond this many bid-doublings the climb to the inflated buy order is fantasy → gate. */
    private static final int MAX_DOUBLINGS = 6;
    /** realism = exp(-doublings / DOUBLING_DECAY): 0 doublings→1, ~2.5→0.37, 6→0.09. */
    private static final double DOUBLING_DECAY = 2.5;
    /** At/above this RiskToolkit score the item is already in an atypical/spiked regime → gate. */
    private static final double MAX_RISK_SCORE = 0.85;
    /** manipPenalty = 1 - RISK_PENALTY_WEIGHT * riskScore (so risk 0→1.0, risk 0.5→0.55). */
    private static final double RISK_PENALTY_WEIGHT = 0.9;
    /** Don't surface plays that take longer than this to fully sell through at current demand. */
    private static final double MAX_SELL_THROUGH_HOURS = 72.0;

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
            double sellWallFactor,     // sell order = targetBuyOrder * factor (> 1)
            double riskScore           // RiskToolkit 0..1: how already-manipulated/atypical the price is
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
        double risk = clamp(in.riskScore, 0.0, 1.0);

        double score = scoreOf(totalProfit, demand, ratio, doublings, risk, sellThroughHours);

        return new Plan(avgBuyCost, minResell, targetBuyOrder, suggestedSellOrder,
                doublings, netProfitPerUnit, totalProfit, ratio, sellThroughHours, score);
    }

    /**
     * Profit discounted by how realistic the manipulation actually is. Hard gates first
     * (any single fatal flaw disqualifies), then a multiplicative blend so the prize only
     * survives when there are real buyers, a believable price-climb and a non-spiked price.
     */
    private static double scoreOf(double totalProfit, double demand, double ratio,
                                  int doublings, double riskScore, Double sellThroughHours) {
        // Hard gates — these are the items the old formula wrongly ranked #1.
        if (totalProfit <= 0) return 0.0;
        if (demand < MIN_DEMAND_PER_HOUR) return 0.0;                       // no real buyers to dump onto
        if (doublings > MAX_DOUBLINGS) return 0.0;                         // bid must climb too far to be believable
        if (riskScore >= MAX_RISK_SCORE) return 0.0;                       // already in an atypical/manipulated regime
        if (sellThroughHours != null && sellThroughHours > MAX_SELL_THROUGH_HOURS) return 0.0;

        double profitScore = safeLog10(totalProfit + 1.0);                 // the prize, compressed

        // Demand quality: absolute throughput dominates, supply imbalance modulates it.
        double throughput = demand / (demand + DEMAND_HALF_SAT);            // 0..1
        double imbalance  = clamp(ratio / RATIO_REFERENCE, 0.0, 1.0);       // 0..1
        double demandQuality = throughput * (0.5 + 0.5 * imbalance);        // 0..1

        double realism = Math.exp(-doublings / DOUBLING_DECAY);            // 0..1
        double manipPenalty = clamp(1.0 - RISK_PENALTY_WEIGHT * riskScore, 0.0, 1.0); // 0..1

        double s = profitScore * demandQuality * realism * manipPenalty;
        return Double.isFinite(s) && s > 0 ? s : 0.0;
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

            // Risk is computed first so the score can penalise/gate already-manipulated items.
            RiskAssessment ra = riskToolkit.assessPriceDeviation(
                    s.getInstantBuyPrice(), s.getInstantSellPrice(),
                    s.getWeightedTwoPercentBuyPrice(), s.getWeightedTwoPercentSellPrice(),
                    a != null ? a.avgCloseInstantBuy() : null,
                    a != null ? a.avgCloseInstantSell() : null);

            Inputs in = new Inputs(
                    s.getInstantBuyPrice(),
                    s.getInstantSellPrice(),
                    agg.getUnits(),
                    agg.getCost(),
                    demand,
                    supply,
                    effTax,
                    effRoi,
                    effWall,
                    ra.riskScore());
            Plan p = plan(in);
            if (p.score() <= 0.0) continue;

            if (p.demandSupplyRatio() < fMinRatio) continue;
            if (p.totalProfit() < fMinProfit) continue;

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
