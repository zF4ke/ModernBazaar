import { BazaarResponse, BazaarProduct } from "../types";
import { HypixelService } from "./hypixel";
import { formatFullNumber, formatItemName } from "../utils/formatting";

export interface ManipulationOpportunity {
    itemId: string;
    currentBuyPrice: number;
    currentSellPrice: number;
    
    // Market analysis
    sellVolume: number;
    sellOrderCount: number;
    buyVolume: number;
    buyOrderCount: number;
    
    // Acquisition costs
    totalAcquisitionCost: number;
    averageCostPerItem: number;
    totalItemsAvailable: number;
    isFullyVisible: boolean; // 👁️ All orders are visible vs estimated
    
    // Minimum viable pricing
    minimumSellPrice: number; // Including 1.125% tax
    breakEvenPrice: number;
    
    // Strategy parameters
    targetSellPrice: number;
    initialBuyOrderPrice: number;
    projectedProfit: number;
    profitMargin: number;
    
    // Risk assessment
    demandScore: number; // How much demand exists
    supplyScore: number; // How constrained supply is
    manipulationScore: number; // Overall viability (0-100)
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    
    // Timeline estimates
    estimatedTimeToSell: number; // Hours based on demand
    weeklyBuyMovement: number;
    weeklySellMovement: number;
}

export interface ManipulationParams {
    maxBudget: number;
    targetROI: number; // 2.0 = 2x return, 3.0 = 3x return, etc.
    maxRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    minDemand: number; // Minimum weekly buy movement
}

export class MarketManipulationService {
    // Cache manipulation opportunities to maintain pagination stability
    private static opportunityCache = new Map<string, {
        opportunities: ManipulationOpportunity[];
        timestamp: number;
        params: ManipulationParams;
    }>();

    private static readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

    /**
     * Generate a cache key from manipulation parameters
     */
    private static getCacheKey(params: ManipulationParams): string {
        return `${params.maxBudget}_${params.targetROI}_${params.maxRisk}_${params.minDemand}`;
    }
    
    /**
     * Clear the cache (called when user runs command again)
     */
    static clearCache(): void {
        this.opportunityCache.clear();
    }
    
    /**
     * Find items suitable for market manipulation with caching for pagination stability
     */
    static async findManipulationOpportunities(
        params: ManipulationParams,
        page: number = 1,
        itemsPerPage: number = 5,
        forceRefresh: boolean = false
    ): Promise<{ 
        opportunities: ManipulationOpportunity[], 
        totalCount: number, 
        totalPages: number, 
        currentPage: number,
        isFromCache: boolean
    }> {
        const cacheKey = this.getCacheKey(params);
        const cached = this.opportunityCache.get(cacheKey);
        const now = Date.now();
        
        // Check if we should use cached data
        if (!forceRefresh && cached && (now - cached.timestamp) < this.CACHE_DURATION) {
            console.log(`Using cached manipulation opportunities (${cached.opportunities.length} items)`);
            
            // Apply pagination to cached results
            const totalCount = cached.opportunities.length;
            const totalPages = Math.ceil(totalCount / itemsPerPage);
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const opportunities = cached.opportunities.slice(startIndex, endIndex);

            return {
                opportunities,
                totalCount,
                totalPages,
                currentPage: page,
                isFromCache: true
            };
        }
        
        console.log(`Fetching fresh manipulation opportunities...`);
        const bazaarData = await HypixelService.getBazaarPrices();
        const allOpportunities: ManipulationOpportunity[] = [];

        // Analyze all items for manipulation potential
        for (const [itemId, product] of Object.entries(bazaarData.products)) {
            const opportunity = this.analyzeManipulationOpportunity(itemId, product, params);
            
            if (opportunity && this.isViableManipulation(opportunity, params)) {
                allOpportunities.push(opportunity);
            }
        }

        // Sort by manipulation score (best opportunities first)
        const sortedOpportunities = allOpportunities.sort((a, b) => b.manipulationScore - a.manipulationScore);
        
        // Cache the results
        this.opportunityCache.set(cacheKey, {
            opportunities: sortedOpportunities,
            timestamp: now,
            params: { ...params }
        });
        
        console.log(`Cached ${sortedOpportunities.length} manipulation opportunities`);

        // Apply pagination
        const totalCount = sortedOpportunities.length;
        const totalPages = Math.ceil(totalCount / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const opportunities = sortedOpportunities.slice(startIndex, endIndex);

        return {
            opportunities,
            totalCount,
            totalPages,
            currentPage: page,
            isFromCache: false
        };
    }

    /**
     * Analyze a single item for manipulation potential
     */
    private static analyzeManipulationOpportunity(
        itemId: string, 
        product: BazaarProduct, 
        params: ManipulationParams
    ): ManipulationOpportunity | null {
        const { quick_status, buy_orders, sell_orders } = product;

        // Need valid order book data
        if (!buy_orders || !sell_orders || buy_orders.length === 0 || sell_orders.length === 0) {
            return null;
        }

        // Current market prices
        const currentBuyPrice = buy_orders[0].pricePerUnit;
        const currentSellPrice = sell_orders[0].pricePerUnit;

        // Market volume analysis - using corrected field names
        const totalItemsInSellOrders = quick_status.totalItemsInSellOrders || 0; // Total items available for sale
        const totalItemsInBuyOrders = quick_status.totalItemsInBuyOrders || 0;   // Total items wanted by buyers
        const sellOrderCount = sell_orders.length;
        const buyOrderCount = buy_orders.length;
        const weeklyBuyMovement = quick_status.buyMovingWeek || 0;
        const weeklySellMovement = quick_status.sellMovingWeek || 0;

        // Calculate total acquisition cost and items available
        // IMPORTANT: API only shows top 30 sell orders, but we need the full market
        
        // For manipulation, we need to know the TOTAL items available in the market
        const totalItemsAvailable = totalItemsInSellOrders; // This is the actual total supply
        
        // For acquisition cost calculation, we need to estimate based on visible orders
        // Since we only see top 30 orders, we'll calculate cost for those visible orders
        // and then estimate the remaining cost based on price trends
        let visibleOrdersCost = 0;
        let visibleItemCount = 0;
        let highestVisiblePrice = 0;

        for (const order of sell_orders) {
            const cost = order.pricePerUnit * order.amount;
            visibleOrdersCost += cost;
            visibleItemCount += order.amount;
            highestVisiblePrice = Math.max(highestVisiblePrice, order.pricePerUnit);
        }

        // DEBUG: Log the values for troubleshooting
        if (itemId.includes('XYZ')) {
            console.log(`DEBUG ${itemId}: totalItemsInSellOrders=${totalItemsInSellOrders}, visibleItemCount=${visibleItemCount}, totalItemsAvailable=${totalItemsAvailable}`);
        }

        // If all items are visible in the orders, use exact calculation
        let totalAcquisitionCost: number;
        let isFullyVisible: boolean;
        
        if (visibleItemCount >= totalItemsAvailable) {
            // We can see all items, use exact cost
            totalAcquisitionCost = visibleOrdersCost;
            isFullyVisible = true; // 👁️ Complete market visibility
            if (itemId.includes('XYZ')) {
                console.log(`DEBUG ${itemId}: totalAcquisitionCost=${totalAcquisitionCost}, isFullyVisible=${isFullyVisible}`);
            }
        } else {
            // We need to estimate the cost of hidden orders
            // Assume remaining items are priced progressively higher than the highest visible price
            const remainingItems = totalItemsAvailable - visibleItemCount;
            
            // Estimate that remaining items cost 20% more than highest visible on average
            const estimatedRemainingAvgPrice = highestVisiblePrice * 1.2;
            const estimatedRemainingCost = remainingItems * estimatedRemainingAvgPrice;
            
            totalAcquisitionCost = visibleOrdersCost + estimatedRemainingCost;
            isFullyVisible = false; // ⚠️ Hidden orders estimated
        }

        // Skip if we can't afford to buy the market
        if (totalAcquisitionCost > params.maxBudget /* || totalItemsAvailable < 10 */) {
            return null;
        }

        // Skip if the total volume seems unrealistic (data quality check)
        if (totalItemsAvailable > 10000000) { // 10M items seems excessive for most items
            return null;
        }

        // Calculate average cost per item
        const averageCostPerItem = totalAcquisitionCost / totalItemsAvailable;

        // Calculate minimum sell price (including 1.125% tax)
        const taxRate = 0.01125; // 1.125% bazaar tax
        const minimumSellPrice = averageCostPerItem / (1 - taxRate);
        const breakEvenPrice = minimumSellPrice;

        // Calculate target sell price based on ROI
        // For true ROI: if you want 3x ROI, total revenue should be 3x total cost
        const targetTotalRevenue = totalAcquisitionCost * params.targetROI;
        const finalTargetPrice = targetTotalRevenue / totalItemsAvailable;

        // For psychological manipulation, set initial sell orders MUCH higher to create attractive margins
        // This creates the illusion that there's huge profit potential, attracting other players
        const manipulationMultiplier = 2.5; // Make initial sell orders 2.5x higher than final target
        const targetSellPrice = finalTargetPrice * manipulationMultiplier;

        // Calculate initial buy order price based on our actual target (not the inflated sell price)
        // We need to account for the 1.125% tax when selling
        const initialBuyOrderPrice = finalTargetPrice * (1 - taxRate); // Price after tax = finalTargetPrice

        // Calculate projected profit based on actual final target (not inflated manipulation price)
        const projectedProfit = (initialBuyOrderPrice * totalItemsAvailable) - totalAcquisitionCost;
        const profitMargin = (projectedProfit / totalAcquisitionCost) * 100;

        // Risk assessment - using corrected field names
        const demandScore = this.calculateDemandScore(weeklyBuyMovement, totalItemsInBuyOrders, buyOrderCount, weeklySellMovement);
        const supplyScore = this.calculateSupplyScore(totalItemsInSellOrders, sellOrderCount, totalItemsAvailable);
        // const manipulationScore = this.calculateManipulationScore(demandScore, supplyScore, profitMargin, totalAcquisitionCost, params.maxBudget, totalItemsAvailable, weeklyBuyMovement);
        const manipulationScore = this.calculateManipulationScore(
            // demandScore, supplyScore, profitMargin,
            totalAcquisitionCost, params.maxBudget, totalItemsAvailable, weeklyBuyMovement, weeklySellMovement
        );

        // print debug information
        console.log(`DEBUG: Manipulation score for ${formatItemName(itemId)}: ${manipulationScore}, with total acquisition cost: ${totalAcquisitionCost}, max budget: ${params.maxBudget}, total items available: ${totalItemsAvailable}, weekly buy movement: ${weeklyBuyMovement}`);

        const riskLevel = this.assessRiskLevel(manipulationScore, totalAcquisitionCost, params.maxBudget);

        // Estimate time to sell based on demand
        // print the item id 
        // console.log(`DEBUG: Selected itemId: "${itemId}" (type: ${typeof itemId}) quick_status.buyMovingWeek: ${quick_status.buyMovingWeek}, weeklyBuyMovement: ${weeklyBuyMovement}`);
        const estimatedTimeToSell = this.estimateTimeToSell(totalItemsAvailable, weeklyBuyMovement);

        return {
            itemId,
            currentBuyPrice,
            currentSellPrice,
            sellVolume: totalItemsInSellOrders,  // Store with legacy name for compatibility
            sellOrderCount,
            buyVolume: totalItemsInBuyOrders,    // Store with legacy name for compatibility
            buyOrderCount,
            totalAcquisitionCost,
            averageCostPerItem,
            totalItemsAvailable,
            isFullyVisible,
            minimumSellPrice,
            breakEvenPrice,
            targetSellPrice,
            initialBuyOrderPrice,
            projectedProfit,
            profitMargin,
            demandScore,
            supplyScore,
            manipulationScore,
            riskLevel,
            estimatedTimeToSell,
            weeklyBuyMovement,
            weeklySellMovement
        };
    }

    /**
     * Calculate demand score (0-100) using AGGRESSIVE scaling - heavily reward high demand
     */
    private static calculateDemandScore(weeklyBuyMovement: number, buyVolume: number, buyOrderCount: number, weeklySellMovement: number): number {
        // CRITICAL: If sell movement > buy movement, this item is FUCKED for manipulation
        const demandSupplyRatio = weeklyBuyMovement / Math.max(weeklySellMovement, 1);
        if (demandSupplyRatio < 1.0) {
            // More selling than buying = manipulation will fail
            return Math.min(10, demandSupplyRatio * 10); // Cap at 10 points if sell > buy
        }
        
        // Convert weekly to hourly demand (what really matters)
        const hourlyBuyMovement = weeklyBuyMovement / 168; // 168 hours in a week
        
        // AGGRESSIVE scoring - heavily reward high demand
        const maxHourlyDemand = 1000; // 1000/hour = very high demand
        const maxBuyVolume = 100000;
        const maxBuyOrders = 100;
        
        // Exponential scaling for better reward distribution - square the logarithmic scores
        const hourlyScore = Math.min(100, Math.pow((Math.log10(hourlyBuyMovement + 1) / Math.log10(maxHourlyDemand + 1)) * 100, 1.5));
        const volumeScore = Math.min(100, Math.pow((Math.log10(buyVolume + 1) / Math.log10(maxBuyVolume + 1)) * 100, 1.5));
        const orderScore = Math.min(100, Math.pow((Math.log10(buyOrderCount + 1) / Math.log10(maxBuyOrders + 1)) * 100, 1.5));
        
        // Weighted average - hourly movement is most important
        const baseScore = (hourlyScore * 0.6) + (volumeScore * 0.25) + (orderScore * 0.15);
        
        // Bonus multiplier for having much more buy than sell movement
        const ratioBonus = Math.min(2.0, demandSupplyRatio); // Up to 2x bonus for high buy/sell ratio
        
        return Math.min(100, baseScore * ratioBonus);
    }

    /**
     * Calculate supply score (0-100) using AGGRESSIVE scaling - heavily penalize high supply
     */
    private static calculateSupplyScore(sellVolume: number, sellOrderCount: number, totalItemsAvailable: number): number {
        // Lower values = higher scores (inverted)
        const maxSellVolume = 10000;
        const maxSellOrders = 50;
        const maxTotalItems = 50000;
        
        // AGGRESSIVE inverted scaling - heavily penalize high supply with exponential curves
        const volumeScore = Math.max(0, 100 - Math.pow(((Math.log10(sellVolume + 1) / Math.log10(maxSellVolume + 1)) * 100), 1.5));
        const orderScore = Math.max(0, 100 - Math.pow(((Math.log10(sellOrderCount + 1) / Math.log10(maxSellOrders + 1)) * 100), 1.5));
        const itemScore = Math.max(0, 100 - Math.pow(((Math.log10(totalItemsAvailable + 1) / Math.log10(maxTotalItems + 1)) * 100), 1.5));
        
        // Weighted average
        return (volumeScore * 0.4) + (orderScore * 0.35) + (itemScore * 0.25);
    }

    /**
     * Calculate overall manipulation viability score (0–100)
     */
    private static calculateManipulationScore(
        totalCost: number,
        maxBudget: number,
        totalItems: number,
        weeklyBuyMovement: number,
        weeklySellMovement: number
    ): number {
        // 0. Budget guard
        if (totalCost > maxBudget) return 0;

        const hourlyBuyMovement = weeklyBuyMovement / 168;
        const avgCostPerItem = totalCost / totalItems;

        // 1. Item count score
        // let itemCountScore = 100;
        // //const idealItemCount = 700;
        // const idealItemCount = 1200;

        // if (totalItems < 16) {
        //     const shortageRatio = (16 - totalItems) / 16;
        //     itemCountScore = Math.max(0, 100 - Math.pow(shortageRatio, 2) * 100);
        // } else if (totalItems > idealItemCount) {
        //     const overflowRatio = (totalItems - idealItemCount) / idealItemCount;
        //     itemCountScore = Math.max(0, 100 - Math.pow(overflowRatio, 2) * 100);
        // }
        // 1. Item count score — ideal between 50 and 10,000
        let itemCountScore = 100;
        const minItemCount = 30;
        const maxItemCount = 2_000;

        if (totalItems < minItemCount) {
            itemCountScore = 0; // Too few items
        } else if (totalItems > maxItemCount) {
            const overflowRatio = (totalItems - maxItemCount) / maxItemCount;
            itemCountScore = Math.max(0, 100 - Math.pow(overflowRatio, 2) * 100);
        } else {
            itemCountScore = 100; // In ideal range
        }
        
        // 2. Demand must exceed item count
        // if (hourlyBuyMovement <= totalItems) itemCountScore = 0; // No demand means no manipulation
        if (hourlyBuyMovement < totalItems) return 0; // No demand means no manipulation

        // 4. Demand score — heavily reward high demand
        const demandRatio = hourlyBuyMovement / totalItems;
        const demandScore = Math.min(100, Math.pow(demandRatio, 0.8) * 40);

        // 5. Cost score
        let costScore;
        const idealMin = 700_000;
        const idealMax = 3_000_000;

        // Cost is always 100 because we enforce a range
        if (avgCostPerItem < idealMin) {
            costScore = 0; // Outside ideal range
        } else if (avgCostPerItem > idealMax) {
            costScore = Math.max(0, 100 - Math.pow((avgCostPerItem - idealMax) / idealMax, 2) * 100);
        } else {
            // if it's lower than 700k, it sucks, but if it's higher than 3M, it might still be okay
            costScore = 100;
        }

        // 6. Supply score — penalize oversupply
        let supplyScore = 100;
        if (weeklySellMovement > weeklyBuyMovement) {
            const oversupplyRatio = weeklySellMovement / Math.max(weeklyBuyMovement, 1);
            supplyScore = Math.max(0, 100 - Math.pow(oversupplyRatio, 1.5) * 20);
        }

        // Final weighted score
        return Math.round(
            itemCountScore * 0.25 +
            demandScore * 0.35 +
            costScore * 0.25 +
            supplyScore * 0.15
        );
    }

    /**
     * Assess risk level based on various factors
     */
    private static assessRiskLevel(manipulationScore: number, totalCost: number, maxBudget: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
        const budgetRatio = totalCost / maxBudget;

        if (manipulationScore >= 80 && budgetRatio <= 0.3) {
            return 'LOW';
        } else if (manipulationScore >= 60 && budgetRatio <= 0.5) {
            return 'MEDIUM';
        } else if (manipulationScore >= 40 && budgetRatio <= 0.7) {
            return 'HIGH';
        } else {
            return 'EXTREME';
        }
    }

    /**
     * Estimate time to sell all items based on demand (simple division)
     */
    private static estimateTimeToSell(totalItems: number, weeklyBuyMovement: number): number {
        if (weeklyBuyMovement === 0) return 999; // Infinite time

        // Simple division: items / hourly demand
        const hourlyBuyMovement = weeklyBuyMovement / (7 * 24); // 168 hours in a week

        // console.log(`DEBUG: Estimating time to sell ${totalItems} items with hourly demand of ${hourlyBuyMovement} = ${totalItems / hourlyBuyMovement} hours`);

        return totalItems / hourlyBuyMovement; // number of hours to sell all items
    }

    /**
     * Check if manipulation opportunity meets criteria
     * Focus on MASSIVE demand and profit relative to budget
     */
    private static isViableManipulation(opportunity: ManipulationOpportunity, params: ManipulationParams): boolean {
        // DEBUG: Comment out ALL filters to see everything
        return true; // Show ALL opportunities regardless of requirements
        
        /*
        // Must meet budget constraints
        if (opportunity.totalAcquisitionCost > params.maxBudget) {
            return false;
        }

        // MASSIVE demand requirements - we want THOUSANDS per week minimum
        let minWeeklyDemand: number;
        if (params.maxBudget >= 1000000000) {        // 1B+ budget
            minWeeklyDemand = Math.max(params.minDemand, 5000);  // At least 5K/week
        } else if (params.maxBudget >= 100000000) {   // 100M+ budget  
            minWeeklyDemand = Math.max(params.minDemand, 2000);  // At least 2K/week
        } else if (params.maxBudget >= 10000000) {    // 10M+ budget
            minWeeklyDemand = Math.max(params.minDemand, 1000);  // At least 1K/week
        } else {
            minWeeklyDemand = Math.max(params.minDemand, 500);   // At least 500/week for smaller budgets
        }
        
        if (opportunity.weeklyBuyMovement < minWeeklyDemand) {
            return false;
        }

        // Must meet risk tolerance
        const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'];
        const maxRiskIndex = riskLevels.indexOf(params.maxRisk);
        const opportunityRiskIndex = riskLevels.indexOf(opportunity.riskLevel);
        
        if (opportunityRiskIndex > maxRiskIndex) {
            return false;
        }

        // Must have positive projected profit
        if (opportunity.projectedProfit <= 0) {
            return false;
        }
        
        // PROFIT RELATIVE TO BUDGET - this is the key metric
        const profitToBudgetRatio = opportunity.projectedProfit / params.maxBudget;
        const targetProfitRatio = params.targetROI - 1; // 2x ROI = 1.0 ratio (100% profit)
        
        // Require at least 75% of target profit ratio
        if (profitToBudgetRatio < (targetProfitRatio * 0.75)) {
            return false;
        }
        
        // Minimum budget utilization requirements
        const budgetUtilization = opportunity.totalAcquisitionCost / params.maxBudget;
        
        if (params.maxBudget >= 100000000) {      // 100M+ budget
            if (budgetUtilization < 0.2) return false;  // Must use at least 20% of budget
        } else if (params.maxBudget >= 10000000) { // 10M+ budget
            if (budgetUtilization < 0.1) return false;  // Must use at least 10% of budget
        } else {
            if (budgetUtilization < 0.05) return false; // Must use at least 5% for smaller budgets
        }

        // Must have reasonable time to sell (based on demand)
        const maxTimeToSell = params.maxBudget >= 100000000 ? 168 : 336; // 1 week for 100M+, 2 weeks for smaller
        if (opportunity.estimatedTimeToSell > maxTimeToSell) {
            return false;
        }

        return true;
        */
    }

    /**
     * Calculate detailed stepping strategy with exact buy order prices
     * Shows how many times to double from current highest buy to target price
     */
    static calculateSteppingStrategy(opportunity: ManipulationOpportunity): {
        steps: { 
            stepNumber: number;
            buyOrderPrice: number; 
            profitPerItem: number;
        }[];
        totalSteps: number;
        currentHighestBuy: number;
        targetBuyPrice: number;
        priceGapToBridge: number;
    } {
        const steps: { 
            stepNumber: number;
            buyOrderPrice: number; 
            profitPerItem: number;
        }[] = [];
        
        const currentHighestBuy = opportunity.currentBuyPrice;
        const targetBuyPrice = opportunity.initialBuyOrderPrice;
        const priceGapToBridge = targetBuyPrice - currentHighestBuy;
        
        // Calculate how to step from current price to target
        let currentPrice = currentHighestBuy;
        let stepNumber = 1;
        
        // Strategy: increase price by 50-100% each step until we reach target
        while (currentPrice < targetBuyPrice && stepNumber <= 15) { // Max 15 steps
            // Increase price by 75% each step (aggressive but not too fast)
            const nextPrice = Math.min(currentPrice * 1.75, targetBuyPrice);
            
            // Calculate profit at this price level
            const profitPerItem = Math.max(0, nextPrice - opportunity.minimumSellPrice);
            
            steps.push({
                stepNumber,
                buyOrderPrice: Math.round(nextPrice * 100) / 100, // Round to 2 decimals
                profitPerItem: Math.round(profitPerItem * 100) / 100
            });
            
            currentPrice = nextPrice;
            stepNumber++;
            
            // If we've reached the target, break
            if (nextPrice >= targetBuyPrice) break;
        }

        return {
            steps,
            totalSteps: steps.length,
            currentHighestBuy,
            targetBuyPrice,
            priceGapToBridge
        };
    }
}
