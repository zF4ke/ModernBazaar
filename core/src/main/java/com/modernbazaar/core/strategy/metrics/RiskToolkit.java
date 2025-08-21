package com.modernbazaar.core.strategy.metrics;

import org.springframework.stereotype.Component;

/**
 * Toolkit de avaliação de risco: desvio de preço vs referências e sinais simples de possível manipulação.
 */
@Component
public class RiskToolkit {

    public record RiskAssessment(
            double deviationBuyPct,
            double deviationSellPct,
            double riskScore,         // 0 (baixo) .. 1 (alto)
            boolean manipulatedLikely,
            String note
    ) {}

    /**
     * Avalia quão afastados estão os preços instantâneos das referências (weighted 2% e médias de fecho).
     * Usa o maior desvio relativo observado e mapeia para um score [0,1].
     */
    public RiskAssessment assessPriceDeviation(
            double instantBuy,
            double instantSell,
            Double refBuyWeighted,
            Double refSellWeighted,
            Double refBuyAvg,
            Double refSellAvg
    ) {
        double refBuy  = bestRef(refBuyWeighted, refBuyAvg);
        double refSell = bestRef(refSellWeighted, refSellAvg);

        double devBuy  = relativeDeviation(instantBuy, refBuy);
        double devSell = relativeDeviation(instantSell, refSell);

        double devMax = Math.max(devBuy, devSell);
        // Mapear desvio para risco: 0%->0, 5%->0.2, 10%->0.5, 20%->1 (clamp)
        double risk = clamp01(devMax / 0.20);
        boolean flag = devMax >= 0.12; // ≥12% de desvio sugere regime atípico/manipulação
        String note = flag ? "Desvio elevado vs referências; possível manipulação/regime atípico." : "Desvio dentro do normal.";

        return new RiskAssessment(devBuy, devSell, risk, flag, note);
    }

    private static double bestRef(Double weighted, Double avg) {
        double w = (weighted != null && weighted > 0) ? weighted : Double.NaN;
        double a = (avg != null && avg > 0) ? avg : Double.NaN;
        if (Double.isFinite(w) && Double.isFinite(a)) return 0.7*w + 0.3*a; // ponderar mais o weighted atual
        if (Double.isFinite(w)) return w;
        if (Double.isFinite(a)) return a;
        return Double.NaN;
    }

    private static double relativeDeviation(double v, double ref) {
        if (!Double.isFinite(v) || !Double.isFinite(ref) || ref <= 0) return 0.0;
        return Math.abs(v - ref) / ref;
    }

    private static double clamp01(double x) { return Math.max(0.0, Math.min(1.0, x)); }
}

