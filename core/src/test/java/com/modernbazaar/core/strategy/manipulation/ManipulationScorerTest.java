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
                2.0);     // sellWallFactor
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
        Inputs noSellers = new Inputs(1000.0, 500.0, 1000L, 1_000_000.0,
                200.0, 0.0, BazaarConstants.DEFAULT_BAZAAR_TAX_RATE, 2.0, 2.0);
        Plan p = scorer.plan(noSellers);
        assertThat(p.demandSupplyRatio()).isEqualTo(5.0); // MAX_RATIO when supply == 0
    }

    @Test
    void noDemand_yieldsZeroScore() {
        Inputs noDemand = new Inputs(1000.0, 500.0, 1000L, 1_000_000.0,
                0.0, 50.0, BazaarConstants.DEFAULT_BAZAAR_TAX_RATE, 2.0, 2.0);
        Plan p = scorer.plan(noDemand);
        assertThat(p.score()).isEqualTo(0.0);
        assertThat(p.estimatedSellThroughHours()).isNull();
    }

    @Test
    void noSupplyToCorner_yieldsZeroPlan() {
        Inputs empty = new Inputs(1000.0, 500.0, 0L, 0.0,
                200.0, 50.0, BazaarConstants.DEFAULT_BAZAAR_TAX_RATE, 2.0, 2.0);
        Plan p = scorer.plan(empty);
        assertThat(p.score()).isEqualTo(0.0);
        assertThat(p.totalProfit()).isEqualTo(0.0);
    }

    @Test
    void higherProfit_scoresHigher() {
        Plan small = scorer.plan(baseInputs());
        Inputs bigger = new Inputs(1000.0, 500.0, 10_000L, 10_000_000.0,
                200.0, 50.0, BazaarConstants.DEFAULT_BAZAAR_TAX_RATE, 2.0, 2.0);
        Plan large = scorer.plan(bigger);
        assertThat(large.score()).isGreaterThan(small.score());
    }

    @Test
    void invalidTaxAndRoi_fallBackToDefaults() {
        Inputs bad = new Inputs(1000.0, 500.0, 1000L, 1_000_000.0,
                200.0, 50.0, Double.NaN, 0.5, 0.5); // tax NaN, roi<1, wall<=1
        Plan p = scorer.plan(bad);
        // roi falls back to 2.0 -> net profit per unit == avgCost
        assertThat(p.netProfitPerUnit()).isCloseTo(1000.0, within(1e-6));
        // wall falls back to 2.0
        assertThat(p.suggestedSellOrderPrice()).isCloseTo(p.targetBuyOrderPrice() * 2.0, within(1e-6));
    }
}
