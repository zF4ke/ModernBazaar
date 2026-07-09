package com.modernbazaar.core.strategy.manipulation;

import com.modernbazaar.core.strategy.BazaarConstants;
import com.modernbazaar.core.strategy.manipulation.ManipulationScorer.Inputs;
import com.modernbazaar.core.strategy.manipulation.ManipulationScorer.Plan;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * Unit tests for the pure manipulation planning math. The scorer's {@code plan}
 * method does no I/O, so it can be exercised with a scorer built from null collaborators.
 */
class ManipulationScorerTest {

    private final ManipulationScorer scorer = new ManipulationScorer(null, null, null, null);

    private static Inputs baseInputs() {
        // 1000 units cost 1,000,000 coins -> avg cost 1000/unit. Current top bid 500.
        return new Inputs(
                1000.0,   // instantBuyPrice (cost to insta-buy a unit)
                500.0,    // instantSellPrice (current top bid)
                1000L,    // cornerSupplyUnits
                1_000_000.0, // cornerCost
                200.0,    // demandPerHour
                50.0,     // supplyPerHour
                BazaarConstants.DEFAULT_BAZAAR_TAX_RATE, // 0.01125
                2.0,      // roi
                2.0,      // sellWallFactor
                5.0,      // createdBuyOrdersPerHour
                1.0,      // createdSellOrdersPerHour
                200.0,    // buyOrderUnitsPerHour
                15.0,     // sellOrderUnitsPerHour
                20.0,     // instaSoldUnitsPerHour
                2.0,      // bidUpMovesPerHour
                1_000.0,  // bidUpPriceDeltaPerHour
                0.55,     // flipperAttentionScore
                2_000_000.0, // flipperProfitPerHour
                20,       // activeSellOrders
                200,      // activeBuyOrders
                1_000L,   // sellVolume
                20_000L,  // buyVolume
                0.0);     // riskScore (not manipulated)
    }

    /** Same as {@link #baseInputs()} but with one field overridden, for terse gating tests. */
    private static Inputs inputs(double demand, double supply, int unitsCost1000, double riskScore) {
        long units = unitsCost1000;
        return new Inputs(1000.0, 500.0, units, units * 1000.0,
                demand, supply, BazaarConstants.DEFAULT_BAZAAR_TAX_RATE, 2.0, 2.0,
                5.0, 1.0, demand, 15.0, supply, 2.0, 1_000.0, 0.55, 2_000_000.0,
                20, 200, units, 20_000L, riskScore);
    }

    @Test
    void breakEvenResellPrice_accountsForTax() {
        Plan p = scorer.plan(baseInputs());
        double tax = BazaarConstants.DEFAULT_BAZAAR_TAX_RATE;

        assertThat(p.avgBuyCostPerUnit()).isEqualTo(1000.0);
        // minResell sells at break-even net of tax: minResell * (1 - tax) == avgBuyCost
        assertThat(p.minResellPrice() * (1 - tax)).isCloseTo(1000.0, within(1e-6));
        assertThat(p.minResellPrice()).isCloseTo(1000.0 / (1 - tax), within(1e-6));
    }

    @Test
    void roiTwo_doublesCapitalAfterTax() {
        Plan p = scorer.plan(baseInputs());
        // targetBuyOrder = minResell * roi; net per unit = target*(1-tax) - avgCost = avgCost*(roi-1)
        assertThat(p.targetBuyOrderPrice()).isCloseTo(p.minResellPrice() * 2.0, within(1e-6));
        assertThat(p.netProfitPerUnit()).isCloseTo(1000.0, within(1e-6)); // avgCost * (2 - 1)
        assertThat(p.totalProfit()).isCloseTo(1_000_000.0, within(1.0));
    }

    @Test
    void sellWall_sitsAboveBuyOrder() {
        Plan p = scorer.plan(baseInputs());
        assertThat(p.suggestedSellOrderPrice()).isCloseTo(p.targetBuyOrderPrice() * 2.0, within(1e-6));
        assertThat(p.suggestedSellOrderPrice()).isGreaterThan(p.targetBuyOrderPrice());
    }

    @Test
    void doublingSteps_isCeilLog2OfGap() {
        Plan p = scorer.plan(baseInputs());
        // target ~= 2022.76, bid = 500 -> ratio ~4.05 -> ceil(log2) = 3
        double expected = Math.ceil(Math.log(p.targetBuyOrderPrice() / 500.0) / Math.log(2.0));
        assertThat(p.buyOrderDoublingSteps()).isEqualTo((int) expected);
        assertThat(p.buyOrderDoublingSteps()).isEqualTo(3);
    }

    @Test
    void sellThroughTime_usesHourlyDemand() {
        Plan p = scorer.plan(baseInputs());
        // 1000 units / 200 per hour = 5h
        assertThat(p.estimatedSellThroughHours()).isCloseTo(5.0, within(1e-6));
    }

    @Test
    void demandSupplyRatio_isCapped() {
        Inputs noSellers = inputs(200.0, 0.0, 1000, 0.0);
        Plan p = scorer.plan(noSellers);
        assertThat(p.demandSupplyRatio()).isEqualTo(5.0); // MAX_RATIO when supply == 0
    }

    @Test
    void baseCase_scoresPositively() {
        // A healthy target — real demand, believable climb, unspiked price — must survive.
        assertThat(scorer.plan(baseInputs()).score()).isGreaterThan(0.0);
    }

    @Test
    void noDemand_yieldsZeroScore() {
        Inputs noDemand = inputs(0.0, 50.0, 1000, 0.0);
        Plan p = scorer.plan(noDemand);
        assertThat(p.score()).isEqualTo(0.0);
        assertThat(p.estimatedSellThroughHours()).isNull();
    }

    @Test
    void demandBelowFloor_isGated() {
        // 0.5 buys/hour: a real positive demand, but far too thin to offload onto -> gated.
        assertThat(scorer.plan(inputs(0.5, 50.0, 1000, 0.0)).score()).isEqualTo(0.0);
    }

    @Test
    void alreadyManipulated_isGated() {
        // High RiskToolkit score = price already in an atypical/spiked regime -> gated,
        // even though the paper profit and demand look fine. This is the SMARTY_PANTS case.
        assertThat(scorer.plan(inputs(200.0, 50.0, 1000, 0.90)).score()).isEqualTo(0.0);
    }

    @Test
    void higherRisk_belowGate_scoresLower() {
        double low  = scorer.plan(inputs(200.0, 50.0, 1000, 0.10)).score();
        double high = scorer.plan(inputs(200.0, 50.0, 1000, 0.60)).score();
        assertThat(high).isGreaterThan(0.0);
        assertThat(high).isLessThan(low);
    }

    @Test
    void fantasyPriceClimb_tooManyDoublings_isGated() {
        // avgBuyCost 5,000,000 vs a tiny 10,000 top bid: the buy order would have to climb
        // ~10 doublings to reach the inflated target — fantasy — so it's gated out.
        Inputs detached = new Inputs(5_000_000.0, 10_000.0, 1L, 5_000_000.0,
                200.0, 50.0, BazaarConstants.DEFAULT_BAZAAR_TAX_RATE, 2.0, 2.0,
                5.0, 1.0, 200.0, 15.0, 50.0, 2.0, 1_000.0, 0.55, 2_000_000.0,
                20, 200, 1L, 20_000L, 0.0);
        Plan p = scorer.plan(detached);
        assertThat(p.buyOrderDoublingSteps()).isGreaterThan(6);
        assertThat(p.score()).isEqualTo(0.0);
    }

    @Test
    void sellThroughBeyondHorizon_isGated() {
        // 1000 units at 1 buy/hour = ~1000h to offload -> capital tied up too long -> gated.
        assertThat(scorer.plan(inputs(1.0, 50.0, 1000, 0.0)).score()).isEqualTo(0.0);
    }

    @Test
    void noSupplyToCorner_yieldsZeroPlan() {
        Inputs empty = new Inputs(1000.0, 500.0, 0L, 0.0,
                200.0, 50.0, BazaarConstants.DEFAULT_BAZAAR_TAX_RATE, 2.0, 2.0,
                5.0, 1.0, 200.0, 15.0, 50.0, 2.0, 1_000.0, 0.55, 2_000_000.0,
                20, 200, 0L, 20_000L, 0.0);
        Plan p = scorer.plan(empty);
        assertThat(p.score()).isEqualTo(0.0);
        assertThat(p.totalProfit()).isEqualTo(0.0);
    }

    @Test
    void higherProfit_scoresHigher() {
        Inputs base = baseInputs();
        Inputs higherRoi = new Inputs(
                base.instantBuyPrice(), base.instantSellPrice(), base.cornerSupplyUnits(), base.cornerCost(),
                base.demandPerHour(), base.supplyPerHour(), base.taxRate(), 3.0, base.sellWallFactor(),
                base.createdBuyOrdersPerHour(), base.createdSellOrdersPerHour(), base.buyOrderUnitsPerHour(),
                base.sellOrderUnitsPerHour(), base.instaSoldUnitsPerHour(), base.bidUpMovesPerHour(),
                base.bidUpPriceDeltaPerHour(), base.flipperAttentionScore(), base.flipperProfitPerHour(),
                base.activeSellOrders(), base.activeBuyOrders(), base.sellVolume(), base.buyVolume(),
                base.riskScore());

        Plan normal = scorer.plan(base);
        Plan richer = scorer.plan(higherRoi);
        assertThat(richer.totalProfit()).isGreaterThan(normal.totalProfit());
        assertThat(richer.score()).isGreaterThan(normal.score());
    }

    @Test
    void invalidTaxAndRoi_fallBackToDefaults() {
        Inputs bad = new Inputs(1000.0, 500.0, 1000L, 1_000_000.0,
                200.0, 50.0, Double.NaN, 0.5, 0.5,
                5.0, 1.0, 200.0, 15.0, 50.0, 2.0, 1_000.0, 0.55, 2_000_000.0,
                20, 200, 1_000L, 20_000L, 0.0); // tax NaN, roi<1, wall<=1
        Plan p = scorer.plan(bad);
        // roi falls back to 2.0 -> net profit per unit == avgCost
        assertThat(p.netProfitPerUnit()).isCloseTo(1000.0, within(1e-6));
        // wall falls back to 2.0
        assertThat(p.suggestedSellOrderPrice()).isCloseTo(p.targetBuyOrderPrice() * 2.0, within(1e-6));
    }

    @Test
    void balancedFormula_survivesAttentionButPenalizesSellPressure() {
        Inputs clean = baseInputs();
        Inputs pressured = new Inputs(
                clean.instantBuyPrice(), clean.instantSellPrice(), clean.cornerSupplyUnits(), clean.cornerCost(),
                clean.demandPerHour(), clean.supplyPerHour(), clean.taxRate(), clean.roi(), clean.sellWallFactor(),
                clean.createdBuyOrdersPerHour(), 12.0, clean.buyOrderUnitsPerHour(), 250.0, 200.0,
                clean.bidUpMovesPerHour(), clean.bidUpPriceDeltaPerHour(), clean.flipperAttentionScore(),
                clean.flipperProfitPerHour(), clean.activeSellOrders(), clean.activeBuyOrders(),
                clean.sellVolume(), clean.buyVolume(), clean.riskScore());

        double cleanScore = scorer.plan(clean, "balanced").score();
        double pressuredScore = scorer.plan(pressured, "balanced").score();

        assertThat(cleanScore).isGreaterThan(0.0);
        assertThat(pressuredScore).isGreaterThan(0.0);
        assertThat(pressuredScore).isLessThan(cleanScore);
    }

    @Test
    void noFormula_usesBalancedByDefault() {
        assertThat(scorer.plan(baseInputs()).score()).isEqualTo(scorer.plan(baseInputs(), "balanced").score());
    }
}
