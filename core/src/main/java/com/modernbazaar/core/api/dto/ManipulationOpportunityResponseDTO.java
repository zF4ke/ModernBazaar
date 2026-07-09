package com.modernbazaar.core.api.dto;

/**
 * A Bazaar Manipulation opportunity: an item with thin supply and strong demand
 * that is cheap enough to "corner" within budget, plus the full step-by-step plan
 * (cost to corner, break-even resell price after tax, inflated buy/sell order
 * prices, the doublings needed, expected profit and sell-through time).
 */
public record ManipulationOpportunityResponseDTO(
        String  productId,
        String  displayName,

        // current market
        double  instantBuyPrice,        // lowest sell order (cost to insta-buy a unit now)
        double  instantSellPrice,       // highest buy order (current top bid)
        double  currentHighestBuyOrder, // = instantSellPrice, named for clarity in the plan

        // cornering the market (step 1-3)
        long    cornerSupplyUnits,      // estimated standing sell units we'd buy out
        double  cornerCost,             // estimated coins to insta-buy every sell offer
        double  avgBuyCostPerUnit,      // cornerCost / cornerSupplyUnits

        // pricing (step 4-5)
        double  taxRate,                // tax assumed when selling (e.g. 0.01125)
        double  minResellPrice,         // break-even sell price net of tax
        double  roi,                    // buy-order inflation multiplier vs minResellPrice
        double  targetBuyOrderPrice,    // inflated buy order we place (minResellPrice * roi)
        double  suggestedSellOrderPrice,// very-high sell wall to lure buyers
        int     buyOrderDoublingSteps,  // times to double the current top bid to reach targetBuyOrderPrice

        // demand / supply signals
        Double  demandPerHour,          // avg units players insta-buy per hour (how fast we offload)
        Double  supplyPerHour,          // avg units players insta-sell per hour (how fast the market refills)
        Double  demandSupplyRatio,      // demand / supply (>1 = more buyers than sellers)
        int     activeSellOrders,       // standing sell orders (thin = easy to corner)
        int     activeBuyOrders,        // standing buy orders (deep demand)
        Double  createdBuyOrdersPerHour,  // new buy orders/hour (more = easier to bait demand)
        Double  createdSellOrdersPerHour, // new sell orders/hour (less = easier to keep cornered)
        long    sellVolume,            // total standing sell units (low = easier to control)
        long    buyVolume,             // total standing buy units (high = stronger demand depth)

        // economics
        double  netProfitPerUnit,       // targetBuyOrderPrice*(1-tax) - avgBuyCostPerUnit
        double  totalProfit,            // netProfitPerUnit * cornerSupplyUnits
        Double  estimatedSellThroughHours, // cornerSupplyUnits / demandPerHour

        // risk + ranking
        Boolean risky,
        String  riskNote,
        double  score
) {}
