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

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
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
 * - demandQuality  = throughput(demand) * (0.35 + 0.65*imbalance) — are there real buyers?
 * - sellThrough    = halfLife / (halfLife + hoursToSell)          — how quickly new buy-order units let you exit
 * - orderFlow      = high created buy orders + low created sell orders
 * - marketControl  = low sell-side depth + high buy-side depth
 * - realism        = exp(-doublings / DECAY)                 — is the bid-climb believable?
 * - manipPenalty   = 1 - W*riskScore                         — is it already manipulated?
 * - score          = profitScore * marketControl * demandQuality * sellThrough * orderFlow * realism * manipPenalty
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
 * Craftable/mergeable items are excluded from manipulation results because an
 * alternative supply path caps the manipulated price. NPC-shop-buyable items
 * should be handled the same way once an NPC buy-price/source list is available;
 * {@code npcSellPrice} is sell-to-NPC, not buy-from-NPC, so it cannot stand in.
 */
@Component
public class ManipulationScorer {

    /** demandSupplyRatio is capped here to avoid runaway values when supply ≈ 0. */
    private static final double MAX_RATIO = 5.0;

    // ── Scoring tunables ─────────────────────────────────────────────────────
    /** Absolute organic-demand floor; below this there is not enough buyer attention to bait. */
    private static final double MIN_DEMAND_PER_HOUR = 1.0;
    /** Demand at which the throughput factor reaches 0.5 (saturating, never hard-capped). */
    private static final double DEMAND_HALF_SAT = 10.0;
    /** Demand/supply ratio half-saturation point; higher ratios remain meaningfully better. */
    private static final double RATIO_HALF_SAT = 3.0;
    /** Sell-through time half-saturation point; manipulation exits should be fast. */
    private static final double SELL_THROUGH_HALF_SAT_HOURS = 3.0;
    /** Don't surface plays that take longer than this to exit via newly created buy-order units. */
    private static final double MAX_SELL_THROUGH_HOURS = 24.0;
    /** Created buy orders/hour where the buy-interest signal reaches 0.5. */
    private static final double CREATED_BUY_ORDER_HALF_SAT = 3.0;
    /** Top-bid upward moves/hour where bidder-chase confidence reaches 0.5. */
    private static final double BID_UP_MOVE_HALF_SAT = 3.0;
    /** Raw flip profit/hour where flipper-attention confidence reaches 0.5. */
    private static final double FLIP_PROFIT_HALF_SAT = 2_000_000.0;
    /** Spread percentage where flipper-attention confidence reaches 0.5. */
    private static final double FLIP_SPREAD_PCT_HALF_SAT = 0.035;
    /** Created sell orders/hour where the low-sell-pressure signal falls to 0.5. */
    private static final double CREATED_SELL_ORDER_HALF_SAT = 2.0;
    /** Sell-order creation is a warning, but can be manageable when exit pressure stays low. */
    private static final double SELL_CREATION_RATIO_HALF_SAT = 2.0;
    /** Sell/insta-sell pressure should be much lower than the new buy-order unit depth. */
    private static final double SELL_PRESSURE_RATIO_HALF_SAT = 0.20;
    /** Estimated cornered units where practical-size scoring reaches 0.5. */
    private static final double CORNER_SUPPLY_HALF_SAT = 10_000.0;
    /** Standing sell orders where the easy-control signal falls to 0.5. */
    private static final double ACTIVE_SELL_ORDER_HALF_SAT = 60.0;
    /** Standing buy orders where the buyer-depth signal reaches 0.5. */
    private static final double ACTIVE_BUY_ORDER_HALF_SAT = 120.0;
    /** Sell volume where the easy-control signal falls to 0.5. */
    private static final double SELL_VOLUME_HALF_SAT = 50_000.0;
    /** Buy volume where the buyer-depth signal reaches 0.5. */
    private static final double BUY_VOLUME_HALF_SAT = 50_000.0;
    /** Beyond this many bid-doublings the climb to the inflated buy order is fantasy → gate. */
    private static final int MAX_DOUBLINGS = 6;
    /** realism = exp(-doublings / DOUBLING_DECAY): 0 doublings→1, ~2.5→0.37, 6→0.09. */
    private static final double DOUBLING_DECAY = 2.5;
    /** At/above this RiskToolkit score the item is already in an atypical/spiked regime → gate. */
    private static final double MAX_RISK_SCORE = 0.85;
    /** manipPenalty = 1 - RISK_PENALTY_WEIGHT * riskScore (so risk 0→1.0, risk 0.5→0.55). */
    private static final double RISK_PENALTY_WEIGHT = 0.9;
    private static final Set<String> CRAFTABLE_ITEM_IDS =
            loadIdResource("/manipulation/craftable-item-ids.txt");
    private static final Set<String> NPC_BUYABLE_ITEM_IDS =
            loadIdResource("/manipulation/npc-buyable-item-ids.txt");

    private final RiskToolkit riskToolkit;
    private final BazaarProductSnapshotRepository snapRepo;
    private final BazaarItemRepository itemRepo;
    private final FinanceMetricsService finance;

    private enum FormulaVersion {
        OVERCLOCKER,
        ATTENTION,
        BALANCED;

        static FormulaVersion parse(String value) {
            if (value == null || value.isBlank()) return BALANCED;
            String normalized = value.trim().toLowerCase(Locale.ROOT);
            return switch (normalized) {
                case "overclocker", "old", "v1" -> OVERCLOCKER;
                case "attention", "new", "v2" -> ATTENTION;
                case "balanced", "hybrid", "v3" -> BALANCED;
                default -> BALANCED;
            };
        }
    }

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
            long   cornerSupplyUnits,  // estimated standing sell units to corner
            double cornerCost,         // estimated coins to insta-buy all sell offers
            double demandPerHour,      // avg units insta-bought / hour
            double supplyPerHour,      // avg units insta-sold / hour
            double taxRate,            // selling tax, e.g. 0.01125
            double roi,                // buy-order inflation vs minResell (>= 1)
            double sellWallFactor,     // sell order = targetBuyOrder * factor (> 1)
            double createdBuyOrdersPerHour,
            double createdSellOrdersPerHour,
            double buyOrderUnitsPerHour,
            double sellOrderUnitsPerHour,
            double instaSoldUnitsPerHour,
            double bidUpMovesPerHour,
            double bidUpPriceDeltaPerHour,
            double flipperAttentionScore,
            double flipperProfitPerHour,
            int activeSellOrders,
            int activeBuyOrders,
            long sellVolume,
            long buyVolume,
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
        return plan(in, FormulaVersion.BALANCED);
    }

    public Plan plan(Inputs in, String formulaVersion) {
        return plan(in, FormulaVersion.parse(formulaVersion));
    }

    private Plan plan(Inputs in, FormulaVersion formulaVersion) {
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

        double exitDemand = nonNeg(in.buyOrderUnitsPerHour);
        double sellPressure = nonNeg(in.sellOrderUnitsPerHour) + nonNeg(in.instaSoldUnitsPerHour);
        Double sellThroughHours = exitDemand > 0 ? (supplyUnits / exitDemand) : null;
        double risk = clamp(in.riskScore, 0.0, 1.0);

        double score = scoreOf(totalProfit, supplyUnits, demand, ratio, doublings, risk, sellThroughHours,
                in.createdBuyOrdersPerHour, in.createdSellOrdersPerHour, exitDemand, sellPressure,
                in.bidUpMovesPerHour, in.flipperAttentionScore, formulaVersion,
                in.activeSellOrders, in.activeBuyOrders, in.sellVolume, in.buyVolume);

        return new Plan(avgBuyCost, minResell, targetBuyOrder, suggestedSellOrder,
                doublings, netProfitPerUnit, totalProfit, ratio, sellThroughHours, score);
    }

    /**
     * Profit discounted by how realistic the manipulation actually is. Hard gates first
     * (any single fatal flaw disqualifies), then a multiplicative blend so the prize only
     * survives when there are real buyers, a believable price-climb and a non-spiked price.
     */
    private static double scoreOf(double totalProfit, long cornerSupplyUnits, double demand, double ratio,
                                  int doublings, double riskScore, Double sellThroughHours,
                                  double createdBuyOrdersPerHour,
                                  double createdSellOrdersPerHour,
                                  double exitDemandUnitsPerHour,
                                  double sellPressureUnitsPerHour,
                                  double bidUpMovesPerHour,
                                  double flipperAttentionScore,
                                  FormulaVersion formulaVersion,
                                  int activeSellOrders,
                                  int activeBuyOrders,
                                  long sellVolume,
                                  long buyVolume) {
        // Hard gates — these are the items the old formula wrongly ranked #1.
        if (totalProfit <= 0) return 0.0;
        if (demand < MIN_DEMAND_PER_HOUR) return 0.0;                       // no real buyers to dump onto
        if (exitDemandUnitsPerHour <= 0) return 0.0;                        // no new buy-order depth to exit into
        if (doublings > MAX_DOUBLINGS) return 0.0;                         // bid must climb too far to be believable
        if (riskScore >= MAX_RISK_SCORE) return 0.0;                       // already in an atypical/manipulated regime
        if (sellThroughHours != null && sellThroughHours > MAX_SELL_THROUGH_HOURS) return 0.0;

        double profitScore = safeLog10(totalProfit + 1.0);                 // the prize, compressed
        double cornerSizeQuality = CORNER_SUPPLY_HALF_SAT
                / (CORNER_SUPPLY_HALF_SAT + Math.max(0.0, cornerSupplyUnits));

        // Demand quality: absolute throughput dominates, supply imbalance modulates it.
        double throughput = demand / (demand + DEMAND_HALF_SAT);            // 0..1
        double imbalance = ratio / (ratio + RATIO_HALF_SAT);                // 0..1, gradual
        double demandQuality = throughput * (0.35 + 0.65 * imbalance);      // 0..1
        double sellThroughQuality = sellThroughHours != null
                ? SELL_THROUGH_HALF_SAT_HOURS / (SELL_THROUGH_HALF_SAT_HOURS + Math.max(0.0, sellThroughHours))
                : 0.0;
        double orderFlowQuality = orderFlowQuality(createdBuyOrdersPerHour, createdSellOrdersPerHour,
                exitDemandUnitsPerHour, sellPressureUnitsPerHour, bidUpMovesPerHour, flipperAttentionScore, formulaVersion);
        double marketControlQuality = marketControlQuality(activeSellOrders, activeBuyOrders, sellVolume, buyVolume);

        double realism = Math.exp(-doublings / DOUBLING_DECAY);            // 0..1
        double manipPenalty = clamp(1.0 - RISK_PENALTY_WEIGHT * riskScore, 0.0, 1.0); // 0..1

        double s = profitScore * cornerSizeQuality * marketControlQuality * demandQuality * sellThroughQuality
                * orderFlowQuality * realism * manipPenalty;
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
                                                         Double minProfit,
                                                         Long maxCornerSupply,
                                                         String formulaVersion) {
        List<BazaarItemSnapshot> snaps = snapRepo.searchLatest(
                filter.q(), filter.minSell(), filter.maxSell(),
                filter.minBuy(), filter.maxBuy(), filter.minSpread());
        if (snaps == null || snaps.isEmpty()) return List.of();

        List<String> ids = snaps.stream().map(BazaarItemSnapshot::getProductId).distinct().sorted().toList();
        Map<String, String> names = preloadNames(new HashSet<>(ids));
        Map<String, SellSideAggregateRow> sellAgg = snapRepo.aggregateLatestSellSide(ids).stream()
                .collect(Collectors.toMap(SellSideAggregateRow::getProductId, r -> r, (a, b) -> a));
        Map<String, FinanceAverages> avgs48 = finance.getAveragesFor(ids, 48);
        Set<String> lowerEnchantIds = ids.stream()
                .map(ManipulationScorer::lowerEnchantTierId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<String, BazaarItemSnapshot> lowerEnchantSnaps = lowerEnchantIds.isEmpty()
                ? Map.of()
                : snapRepo.findLatestByProductIds(lowerEnchantIds).stream()
                .collect(Collectors.toMap(BazaarItemSnapshot::getProductId, s -> s, (a, b) -> a));

        final double effTax  = taxRate != null ? taxRate : BazaarConstants.DEFAULT_BAZAAR_TAX_RATE;
        final double effRoi  = roi != null ? roi : BazaarConstants.DEFAULT_MANIPULATION_ROI;
        final double effWall = sellWallFactor != null ? sellWallFactor : BazaarConstants.DEFAULT_SELL_WALL_FACTOR;
        final double fBudget = budget != null ? budget : Double.POSITIVE_INFINITY;
        final double fMinRatio = minDemandSupplyRatio != null ? minDemandSupplyRatio : Double.NEGATIVE_INFINITY;
        final double fMinProfit = minProfit != null ? minProfit : Double.NEGATIVE_INFINITY;
        final long fMaxCornerSupply = maxCornerSupply != null && maxCornerSupply > 0
                ? maxCornerSupply : Long.MAX_VALUE;
        final FormulaVersion fFormulaVersion = FormulaVersion.parse(formulaVersion);

        List<ManipulationOpportunityResponseDTO> out = new ArrayList<>(snaps.size());
        for (BazaarItemSnapshot s : snaps) {
            String id = s.getProductId();
            if (isExcludedAlternativeSupply(id)) continue;

            SellSideAggregateRow agg = sellAgg.get(id);
            if (agg == null || agg.getUnits() <= 0 || agg.getCost() <= 0) continue; // nothing to corner
            CornerEstimate corner = estimateCorner(agg, s);
            if (corner.supplyUnits() <= 0 || corner.cost() <= 0) continue;
            if (corner.supplyUnits() > fMaxCornerSupply) continue;

            // Budget gate: we must be able to buy the estimated full sell side, not only visible rows.
            if (corner.cost() > fBudget) continue;

            FinanceAverages a = avgs48.get(id);
            if (a == null) continue; // manipulation needs historical order-flow signals, not just a live snapshot
            double demand = a.avgInstaBoughtItems();
            double supply = a.avgInstaSoldItems();
            Double createdBuyOrders = a.avgCreatedBuyOrders();
            Double createdSellOrders = a.avgCreatedSellOrders();
            double buyOrderUnitsPerHour = nonNeg(a.avgAddedItemsBuyOrders());
            double sellOrderUnitsPerHour = nonNeg(a.avgAddedItemsSellOrders());
            double sellPressureUnitsPerHour = sellOrderUnitsPerHour + nonNeg(a.avgInstaSoldItems());
            double bidUpMovesPerHour = nonNeg(a.avgBidUpMoves());
            double bidUpPriceDeltaPerHour = nonNeg(a.avgBidUpPriceDelta());
            FlipAttention flipAttention = estimateFlipAttention(s, demand, supply);

            // Risk is computed first so the score can penalise/gate already-manipulated items.
            RiskAssessment ra = riskToolkit.assessPriceDeviation(
                    s.getInstantBuyPrice(), s.getInstantSellPrice(),
                    s.getWeightedTwoPercentBuyPrice(), s.getWeightedTwoPercentSellPrice(),
                    a != null ? a.avgCloseInstantBuy() : null,
                    a != null ? a.avgCloseInstantSell() : null);

            Inputs in = new Inputs(
                    s.getInstantBuyPrice(),
                    s.getInstantSellPrice(),
                    corner.supplyUnits(),
                    corner.cost(),
                    demand,
                    supply,
                    effTax,
                    effRoi,
                    effWall,
                    createdBuyOrders != null ? createdBuyOrders : -1.0,
                    createdSellOrders != null ? createdSellOrders : -1.0,
                    buyOrderUnitsPerHour,
                    sellOrderUnitsPerHour,
                    a.avgInstaSoldItems(),
                    bidUpMovesPerHour,
                    bidUpPriceDeltaPerHour,
                    flipAttention.score(),
                    flipAttention.profitPerHour(),
                    s.getActiveSellOrdersCount(),
                    s.getActiveBuyOrdersCount(),
                    s.getSellVolume(),
                    s.getBuyVolume(),
                    ra.riskScore());
            Plan p = plan(in, fFormulaVersion);
            if (p.score() <= 0.0) continue;
            if (hasCheaperEnchantCombineSupply(id, lowerEnchantSnaps, p.targetBuyOrderPrice())) continue;

            if (p.demandSupplyRatio() < fMinRatio) continue;
            if (p.totalProfit() < fMinProfit) continue;

            out.add(new ManipulationOpportunityResponseDTO(
                    id,
                    names.getOrDefault(id, id),
                    s.getInstantBuyPrice(),
                    s.getInstantSellPrice(),
                    s.getInstantSellPrice(),
                    corner.supplyUnits(),
                    corner.cost(),
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
                    createdBuyOrders,
                    createdSellOrders,
                    buyOrderUnitsPerHour,
                    sellPressureUnitsPerHour,
                    bidUpMovesPerHour,
                    bidUpPriceDeltaPerHour,
                    flipAttention.score(),
                    flipAttention.profitPerHour(),
                    s.getSellVolume(),
                    s.getBuyVolume(),
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

    private static boolean isExcludedAlternativeSupply(String productId) {
        if (productId == null || productId.isBlank()) return false;
        String normalized = normalizeId(productId);
        return CRAFTABLE_ITEM_IDS.contains(normalized) || NPC_BUYABLE_ITEM_IDS.contains(normalized);
    }

    private static boolean hasCheaperEnchantCombineSupply(String productId,
                                                          Map<String, BazaarItemSnapshot> lowerEnchantSnaps,
                                                          double targetBuyOrderPrice) {
        String lowerId = lowerEnchantTierId(productId);
        if (lowerId == null || !Double.isFinite(targetBuyOrderPrice) || targetBuyOrderPrice <= 0) return false;
        BazaarItemSnapshot lower = lowerEnchantSnaps.get(lowerId);
        if (lower == null || !Double.isFinite(lower.getInstantBuyPrice()) || lower.getInstantBuyPrice() <= 0) {
            return false;
        }
        double combineCost = lower.getInstantBuyPrice() * 2.0;
        return combineCost <= targetBuyOrderPrice;
    }

    private static String lowerEnchantTierId(String productId) {
        if (productId == null || !productId.startsWith("ENCHANTMENT_")) return null;
        int sep = productId.lastIndexOf('_');
        if (sep <= "ENCHANTMENT_".length() || sep >= productId.length() - 1) return null;
        String levelPart = productId.substring(sep + 1);
        try {
            int level = Integer.parseInt(levelPart);
            if (level <= 1) return null;
            return productId.substring(0, sep + 1) + (level - 1);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static Set<String> loadIdResource(String path) {
        try (InputStream in = ManipulationScorer.class.getResourceAsStream(path)) {
            if (in == null) return Set.of();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
                return reader.lines()
                        .map(String::trim)
                        .filter(line -> !line.isEmpty() && !line.startsWith("#"))
                        .map(ManipulationScorer::normalizeId)
                        .collect(Collectors.toUnmodifiableSet());
            }
        } catch (Exception ignored) {
            return Set.of();
        }
    }

    private static String normalizeId(String id) {
        return id.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_").replaceAll("^_+|_+$", "");
    }

    private record CornerEstimate(long supplyUnits, double cost) {}

    private static CornerEstimate estimateCorner(SellSideAggregateRow agg, BazaarItemSnapshot s) {
        long visibleUnits = Math.max(0L, agg.getUnits());
        double visibleCost = nonNeg(agg.getCost());
        if (visibleUnits <= 0 || visibleCost <= 0) {
            return new CornerEstimate(0L, 0.0);
        }

        long visibleOrders = Math.max(0L, agg.getVisibleOrders());
        long totalSellOrders = Math.max(0, s.getActiveSellOrdersCount());
        long missingOrders = totalSellOrders > visibleOrders ? totalSellOrders - visibleOrders : 0L;

        double estimatedUnits = visibleUnits;
        if (visibleOrders > 0 && missingOrders > 0) {
            double visibleUnitsPerOrder = visibleUnits / (double) visibleOrders;
            estimatedUnits = Math.max(estimatedUnits, visibleUnits + missingOrders * visibleUnitsPerOrder);
        }
        if (s.getSellVolume() > visibleUnits) {
            estimatedUnits = Math.max(estimatedUnits, s.getSellVolume());
        }

        double avgVisiblePrice = visibleCost / visibleUnits;
        double worstVisiblePrice = nonNeg(agg.getMaxVisiblePrice());
        double hiddenUnitPrice = Math.max(avgVisiblePrice, worstVisiblePrice);
        double hiddenOrderRatio = visibleOrders > 0
                ? Math.min(1.0, missingOrders / (double) visibleOrders)
                : (missingOrders > 0 ? 1.0 : 0.0);
        hiddenUnitPrice *= 1.0 + 0.25 * hiddenOrderRatio;

        double hiddenUnits = Math.max(0.0, estimatedUnits - visibleUnits);
        double estimatedCost = visibleCost + hiddenUnits * hiddenUnitPrice;
        return new CornerEstimate((long) Math.ceil(estimatedUnits), estimatedCost);
    }

    private static double nonNeg(double v) { return (Double.isFinite(v) && v > 0) ? v : 0.0; }
    private static double clamp(double x, double lo, double hi) { return Math.max(lo, Math.min(hi, x)); }
    private static double safeLog10(double x) { return Math.log10(Math.max(1e-9, x)); }
    private static double log2(double x) { return Math.log(x) / Math.log(2.0); }
    private static double weeklyPerHour(long movingWeek) { return movingWeek > 0 ? movingWeek / 168.0 : 0.0; }

    private static double orderFlowQuality(double createdBuyOrdersPerHour, double createdSellOrdersPerHour,
                                           double exitDemandUnitsPerHour, double sellPressureUnitsPerHour,
                                           double bidUpMovesPerHour,
                                           double flipperAttentionScore,
                                           FormulaVersion formulaVersion) {
        if (!Double.isFinite(createdBuyOrdersPerHour) || !Double.isFinite(createdSellOrdersPerHour)
                || createdBuyOrdersPerHour < 0 || createdSellOrdersPerHour < 0
                || !Double.isFinite(exitDemandUnitsPerHour) || !Double.isFinite(sellPressureUnitsPerHour)
                || !Double.isFinite(bidUpMovesPerHour) || !Double.isFinite(flipperAttentionScore)) {
            return 0.65;
        }

        double buyOrders = Math.max(0.0, createdBuyOrdersPerHour);
        double sellOrders = Math.max(0.0, createdSellOrdersPerHour);
        double exitDepth = Math.max(0.0, exitDemandUnitsPerHour);
        double sellPressure = Math.max(0.0, sellPressureUnitsPerHour);
        double bidUpMoves = Math.max(0.0, bidUpMovesPerHour);
        double flipperAttention = clamp(flipperAttentionScore, 0.0, 1.0);
        double buyHeat = buyOrders / (buyOrders + CREATED_BUY_ORDER_HALF_SAT);
        double sellQuiet = CREATED_SELL_ORDER_HALF_SAT / (CREATED_SELL_ORDER_HALF_SAT + sellOrders);
        double buySideShare = (buyOrders + 0.5) / (buyOrders + sellOrders + 1.0);
        double pressureQuiet = exitDepth / (exitDepth + sellPressure + 1.0);
        double sellCreationRatio = sellOrders / (buyOrders + 1.0);
        double sellCreationDominanceQuiet = ratioQuiet(sellCreationRatio, SELL_CREATION_RATIO_HALF_SAT);
        double sellPressureRatio = sellPressure / (exitDepth + 1.0);
        double sellPressureQuiet = ratioQuiet(sellPressureRatio, SELL_PRESSURE_RATIO_HALF_SAT);

        if (formulaVersion == FormulaVersion.OVERCLOCKER) {
            double blended = 0.30 * buyHeat
                    + 0.20 * buySideShare
                    + 0.15 * sellQuiet
                    + 0.25 * pressureQuiet
                    + 0.10 * sellCreationDominanceQuiet;
            double base = 0.05 + 0.95 * clamp(blended, 0.0, 1.0);
            return base
                    * (0.55 + 0.45 * sellCreationDominanceQuiet)
                    * (0.10 + 0.90 * sellPressureQuiet);
        }

        if (formulaVersion == FormulaVersion.BALANCED) {
            double bidChase = bidUpMoves / (bidUpMoves + BID_UP_MOVE_HALF_SAT);
            double attention = 0.30 * buyHeat
                    + 0.25 * bidChase
                    + 0.25 * flipperAttention
                    + 0.20 * buySideShare;
            double pressureSurvival = 0.55 * sellPressureQuiet
                    + 0.25 * sellCreationDominanceQuiet
                    + 0.20 * pressureQuiet;
            double blended = 0.25 * buyHeat
                    + 0.20 * buySideShare
                    + 0.20 * pressureQuiet
                    + 0.15 * sellQuiet
                    + 0.10 * bidChase
                    + 0.10 * flipperAttention;
            double base = 0.05 + 0.95 * clamp(blended, 0.0, 1.0);
            return base
                    * (0.30 + 0.70 * clamp(attention, 0.0, 1.0))
                    * (0.15 + 0.85 * clamp(pressureSurvival, 0.0, 1.0))
                    * (0.35 + 0.65 * sellPressureQuiet)
                    * (0.50 + 0.50 * sellCreationDominanceQuiet);
        }

        double bidChase = bidUpMoves / (bidUpMoves + BID_UP_MOVE_HALF_SAT);
        double blended = 0.30 * buyHeat
                + 0.25 * bidChase
                + 0.15 * buySideShare
                + 0.15 * sellQuiet
                + 0.20 * pressureQuiet
                + 0.05 * flipperAttention
                + 0.05 * sellCreationDominanceQuiet;
        double base = 0.05 + 0.95 * clamp(blended, 0.0, 1.0);
        return base
                * (0.35 + 0.65 * bidChase)
                * (0.45 + 0.55 * flipperAttention)
                * (0.55 + 0.45 * sellCreationDominanceQuiet)
                * (0.10 + 0.90 * sellPressureQuiet);
    }

    private record FlipAttention(double score, double profitPerHour) {}

    private static FlipAttention estimateFlipAttention(BazaarItemSnapshot s, double demandPerHour, double supplyPerHour) {
        double bid = s.getInstantSellPrice();
        double ask = s.getInstantBuyPrice();
        if (!Double.isFinite(bid) || !Double.isFinite(ask) || bid <= 0 || ask <= bid) {
            return new FlipAttention(0.0, 0.0);
        }
        double spread = ask - bid;
        double spreadPct = spread / bid;
        double throughput = Math.min(nonNeg(demandPerHour), nonNeg(supplyPerHour));
        double profitPerHour = spread * throughput;
        double profitQuality = profitPerHour / (profitPerHour + FLIP_PROFIT_HALF_SAT);
        double spreadQuality = spreadPct / (spreadPct + FLIP_SPREAD_PCT_HALF_SAT);
        double score = Math.sqrt(clamp(profitQuality, 0.0, 1.0) * clamp(spreadQuality, 0.0, 1.0));
        return new FlipAttention(score, profitPerHour);
    }

    private static double ratioQuiet(double ratio, double halfSat) {
        if (!Double.isFinite(ratio) || ratio <= 0) return 1.0;
        double scaled = ratio / Math.max(1e-9, halfSat);
        return 1.0 / (1.0 + scaled * scaled);
    }

    private static double marketControlQuality(int activeSellOrders, int activeBuyOrders,
                                               long sellVolume, long buyVolume) {
        double sellOrders = Math.max(0.0, activeSellOrders);
        double buyOrders = Math.max(0.0, activeBuyOrders);
        double sellUnits = Math.max(0.0, sellVolume);
        double buyUnits = Math.max(0.0, buyVolume);

        double sellOrderThinness = ACTIVE_SELL_ORDER_HALF_SAT / (ACTIVE_SELL_ORDER_HALF_SAT + sellOrders);
        double sellVolumeThinness = SELL_VOLUME_HALF_SAT / (SELL_VOLUME_HALF_SAT + sellUnits);
        double buyOrderDepth = buyOrders / (buyOrders + ACTIVE_BUY_ORDER_HALF_SAT);
        double buyVolumeDepth = buyUnits / (buyUnits + BUY_VOLUME_HALF_SAT);
        double orderImbalance = (buyOrders + 1.0) / (buyOrders + sellOrders + 2.0);
        double volumeImbalance = (buyUnits + 1.0) / (buyUnits + sellUnits + 2.0);

        double blended = 0.25 * sellOrderThinness
                + 0.25 * sellVolumeThinness
                + 0.20 * buyOrderDepth
                + 0.15 * buyVolumeDepth
                + 0.10 * orderImbalance
                + 0.05 * volumeImbalance;
        return 0.15 + 0.85 * clamp(blended, 0.0, 1.0);
    }
}
