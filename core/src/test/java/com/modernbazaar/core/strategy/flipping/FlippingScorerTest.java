package com.modernbazaar.core.strategy.flipping;

import com.modernbazaar.core.strategy.flipping.FlippingScorer.Inputs;
import com.modernbazaar.core.strategy.flipping.FlippingScorer.Score;
import com.modernbazaar.core.strategy.metrics.RiskToolkit;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * Unit tests for the pure scoring math in {@link FlippingScorer}. The score methods only
 * use the (stateless) {@link RiskToolkit}; the repositories / finance service are unused
 * here, so they are passed as null. References are set equal to the instant prices to make
 * the risk score deterministic (zero) unless a test deliberately introduces a deviation.
 */
class FlippingScorerTest {

    private final FlippingScorer scorer = new FlippingScorer(new RiskToolkit(), null, null, null);

    /** No-risk inputs: refs equal instant prices, healthy flow, no competition. */
    private static Inputs zeroRisk(double ib, double is, double demand, double supply) {
        return new Inputs(ib, is, demand + supply, 0.0, 0.0,
                ib, is, ib, is, demand, supply, null, 1.0);
    }

    @Test
    void invalidPrices_yieldZeroScore() {
        Score s = scorer.score(new Inputs(0.0, 100.0, 0, 0, 0, null, null, null, null, 10.0, 10.0, null, 1.0));
        assertThat(s.score()).isZero();
        assertThat(s.spread()).isZero();
    }

    @Test
    void nonPositiveSpread_yieldsZeroScore() {
        // ib < is -> spread clamped to 0
        Score s = scorer.score(zeroRisk(100.0, 110.0, 50, 50));
        assertThat(s.spread()).isZero();
        assertThat(s.score()).isZero();
    }

    @Test
    void spreadAndSpreadPct_areComputed() {
        Score s = scorer.score(zeroRisk(110.0, 100.0, 50, 50));
        assertThat(s.spread()).isEqualTo(10.0);
        assertThat(s.spreadPct()).isCloseTo(0.10, within(1e-9));
        assertThat(s.risky()).isFalse();
        assertThat(s.score()).isGreaterThan(0.0);
    }

    @Test
    void lowThroughput_isGatedToZeroScore() {
        // demand/supply below the 1 u/h floor
        Score s = scorer.score(zeroRisk(110.0, 100.0, 0.4, 0.4));
        assertThat(s.throughputPerHour()).isZero();
        assertThat(s.score()).isZero();
    }

    @Test
    void profitPerItem_isRiskAdjustedByDefault() {
        // instantBuy deviates 10% above all references -> riskScore ~0.5
        Inputs risky = new Inputs(110.0, 100.0, 100, 0.0, 0.0,
                100.0, 100.0, 100.0, 100.0, 50.0, 50.0, null, 1.0);
        Score s = scorer.scoreWithToggles(risky, Boolean.FALSE, Boolean.FALSE);
        assertThat(s.riskScore()).isCloseTo(0.5, within(1e-6));
        // spread 10 discounted by (1 - 0.5)
        assertThat(s.profitPerItem()).isCloseTo(5.0, within(1e-6));
    }

    @Test
    void disableRiskPenalties_exposesRawMargin() {
        Inputs risky = new Inputs(110.0, 100.0, 100, 0.0, 0.0,
                100.0, 100.0, 100.0, 100.0, 50.0, 50.0, null, 1.0);
        Score withRisk = scorer.scoreWithToggles(risky, Boolean.FALSE, Boolean.FALSE);
        Score raw = scorer.scoreWithToggles(risky, Boolean.TRUE, Boolean.FALSE);

        // Toggle on -> full spread margin, higher profit and score
        assertThat(raw.profitPerItem()).isCloseTo(10.0, within(1e-6));
        assertThat(raw.profitPerItem()).isGreaterThan(withRisk.profitPerItem());
        assertThat(raw.score()).isGreaterThan(withRisk.score());
    }

    @Test
    void budget_limitsPlannedUnitsPerHour() {
        // Budget only affords ~3 units/hour at is=100 over horizon 1, well below throughput 50
        Inputs in = new Inputs(110.0, 100.0, 100, 0.0, 0.0,
                110.0, 100.0, 110.0, 100.0, 50.0, 50.0, 300.0, 1.0);
        Score s = scorer.score(in);
        assertThat(s.plannedUnitsPerHour()).isEqualTo(3.0);
        assertThat(s.plannedUnitsPerHour()).isLessThan(s.throughputPerHour());
    }

    @Test
    void noBudget_usesThroughputAsCapacity() {
        Score s = scorer.score(zeroRisk(110.0, 100.0, 50, 50));
        assertThat(s.plannedUnitsPerHour()).isEqualTo(50.0);
    }

    @Test
    void fillEtas_arePresentWhenSuggestedPositive() {
        Score s = scorer.score(zeroRisk(110.0, 100.0, 50, 50));
        assertThat(s.suggestedUnitsPerHour()).isGreaterThan(0.0);
        assertThat(s.suggestedBuyFillHours()).isNotNull();
        assertThat(s.suggestedSellFillHours()).isNotNull();
        assertThat(s.suggestedTotalFillHours())
                .isCloseTo(s.suggestedBuyFillHours() + s.suggestedSellFillHours(), within(1e-9));
    }

    @Test
    void higherProfit_scoresHigher() {
        Score small = scorer.score(zeroRisk(110.0, 100.0, 50, 50));
        Score large = scorer.score(zeroRisk(200.0, 100.0, 500, 500));
        assertThat(large.score()).isGreaterThan(small.score());
    }

    @Test
    void competitionPenalty_reducesScore_andToggleRemovesIt() {
        // heavy created-orders churn on both sides
        Inputs busy = new Inputs(110.0, 100.0, 100, 500.0, 500.0,
                110.0, 100.0, 110.0, 100.0, 50.0, 50.0, null, 1.0);
        Score penalized = scorer.scoreWithToggles(busy, Boolean.FALSE, Boolean.FALSE);
        Score noComp = scorer.scoreWithToggles(busy, Boolean.FALSE, Boolean.TRUE);
        assertThat(noComp.score()).isGreaterThan(penalized.score());
    }
}
