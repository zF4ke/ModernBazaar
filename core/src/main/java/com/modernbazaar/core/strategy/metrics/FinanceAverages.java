package com.modernbazaar.core.strategy.metrics;

/**
 * Média das últimas N horas para sinais de fluxo/competição/liquidez.
 * Todos os campos são médias simples (aritméticas) sobre N observações.
 */
public record FinanceAverages (
        String productId,
        int    windowHours,
        // preços BUY
        double avgOpenInstantBuy,
        double avgCloseInstantBuy,
        double avgMinInstantBuy,
        double avgMaxInstantBuy,
        // preços SELL
        double avgOpenInstantSell,
        double avgCloseInstantSell,
        double avgMinInstantSell,
        double avgMaxInstantSell,
        // competição e deltas
        double avgCreatedBuyOrders,
        double avgCreatedSellOrders,
        double avgDeltaBuyOrders,
        double avgDeltaSellOrders,
        double avgAddedItemsBuyOrders,
        double avgAddedItemsSellOrders,
        // fluxo de insta-trades
        double avgInstaBoughtItems,
        double avgInstaSoldItems
) {}
