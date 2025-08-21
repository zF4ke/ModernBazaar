package com.modernbazaar.core.api.dto;

/**
 * Oportunidade de flipping (resumo): preços, spread, supply/demand/competition por hora, risco e score único.
 */
public record FlipOpportunityResponseDTO(
        String  productId,
        String  displayName,
        // instant prices (lowest sell = insta buy; highest buy = insta sell)
        double  instantBuyPrice,
        double  instantSellPrice,
        // order-book top prices (claros para BO→SO)
        Double  buyOrderPrice,     // = instantSellPrice (topo dos compradores)
        Double  sellOrderPrice,    // = instantBuyPrice (topo dos vendedores)
        // spread
        double  spread,
        double  spreadPct,
        // métricas fáceis de ler (médias/hora)
        Double  demandPerHour,          // avg instaBought ou |Δ buy orders|
        Double  supplyPerHour,          // avg instaSold  ou |Δ sell orders|
        Double  competitionPerHour,     // avg createdBuy + createdSell
        // execução e lucros (por hora)
        Double  throughputPerHour,      // min(demanda, oferta)
        Double  plannedUnitsPerHour,    // limitado por budget (ou throughput se sem budget)
        Double  suggestedUnitsPerHour,  // ajustado por competição (aprox. quota realizável)
        Double  profitPerItem,          // spread ajustado a risco
        Double  profitPerHour,          // profitPerItem * plannedUnitsPerHour
        Double  reasonableProfitPerHour,// profitPerItem * suggestedUnitsPerHour
        // ETAs (h) para a quantidade sugerida
        Double  suggestedBuyFillHours,  // tempo estimado para encher via buy orders
        Double  suggestedSellFillHours, // tempo estimado para liquidar via sell orders
        Double  suggestedTotalFillHours,// buy + sell
        // risco
        Double  riskScore,              // 0..1
        Boolean risky,
        // score único (eficiência)
        double  score
) {}
