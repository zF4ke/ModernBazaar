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
     * Avalia quão afastados estão os preços instantâneos das referências (weighted 2% e médias de fecho)
     * e detecta choques (saltos súbitos) entre a referência "weighted" e a média histórica.
     * Estratégia revisada:
     * 1. Calcula desvios relativos de instantBuy/instantSell contra cada referência disponível separadamente (não mistura).
     * 2. Se existirem weighted e avg, mede também o "shock" = |weighted - avg| / avg (proxy de salto súbito recente).
     * 3. Score base: max(desvioInstantVsAvg, desvioInstantVsWeighted).
     * 4. Score choque: shock / 0.25 (≥25% => risco máximo) — enfatiza saltos abruptos mesmo se instant == weighted.
     * 5. Risk final = clamp(max(score base mapeado ( /0.20 ), score choque)).
     * 6. Flag manipulatedLikely se:
     *    - qualquer desvio instant vs referência ≥ 15%, ou
     *    - shock ≥ 12%, ou
     *    - risk final ≥ 0.85.
     */
    public RiskAssessment assessPriceDeviation(
            double instantBuy,
            double instantSell,
            Double refBuyWeighted,
            Double refSellWeighted,
            Double refBuyAvg,
            Double refSellAvg
    ) {
        // Desvios instantâneos vs cada ref (quando disponível)
        double devBuyVsWeighted  = relativeDeviation(instantBuy, refBuyWeighted);
        double devBuyVsAvg       = relativeDeviation(instantBuy, refBuyAvg);
        double devSellVsWeighted = relativeDeviation(instantSell, refSellWeighted);
        double devSellVsAvg      = relativeDeviation(instantSell, refSellAvg);

        // Melhor desvio "representativo" por lado (instant vs ref mais estável disponível)
        double devBuy = max(devBuyVsWeighted, devBuyVsAvg);   // usar max para ser conservador (pior caso)
        double devSell = max(devSellVsWeighted, devSellVsAvg);

        // Choques entre weighted e avg (quando ambos existem)
        double shockBuy  = relativeDeviation(refBuyWeighted, refBuyAvg);
        double shockSell = relativeDeviation(refSellWeighted, refSellAvg);
        double shockMax = max(shockBuy, shockSell);

        // Score base (desvio instantâneo vs refs) mapeado para 0..1 em 20% (>=20% => 1)
        double baseDevMax = max(devBuy, devSell);
        double baseRisk = clamp01(baseDevMax / 0.20);

        // Score de choque (saltos onde weighted já reflete price spike): 25% ⇒ 1
        double shockRisk = clamp01(shockMax / 0.25);

        // Risk final enfatiza o maior sinal
        double risk = clamp01(max(baseRisk, shockRisk));

        boolean manipulatedLikely =
                baseDevMax >= 0.15 ||
                shockMax >= 0.12 ||
                risk >= 0.85;

        StringBuilder note = new StringBuilder();
        if (manipulatedLikely) {
            note.append("Possible manipulation / atypical regime: ");
            if (shockMax >= 0.12) note.append("ref shock≥12% ");
            if (baseDevMax >= 0.15) note.append("instant deviation≥15% ");
            if (risk >= 0.85) note.append("risk≥0.85 ");
        } else {
            note.append("Deviations within normal range.");
        }

        return new RiskAssessment(devBuy, devSell, risk, manipulatedLikely, note.toString().trim());
    }

    private static double relativeDeviation(Double v, Double ref) {
        if (v == null || ref == null) return 0.0;
        if (!Double.isFinite(v) || !Double.isFinite(ref) || ref <= 0) return 0.0;
        return Math.abs(v - ref) / ref;
    }

    private static double clamp01(double x) { return Math.max(0.0, Math.min(1.0, x)); }
    private static double max(double a, double b) { return a >= b ? a : b; }
}
