import { Recipe, CraftingCalculation } from "../types";
import { HypixelService } from "./hypixel";
import { RecipeDatabase } from "../data/recipes";
import { ERROR_MESSAGES, FLIPPING_ANALYSIS } from "../constants";
import { Logger } from "../utils/logger";

export enum PricingStrategy {
    BUY_ORDER_SELL_ORDER = 'buy_order_sell_order',
    BUY_ORDER_INSTANT_SELL = 'buy_order_instant_sell', 
    INSTANT_BUY_SELL_ORDER = 'instant_buy_sell_order',
    INSTANT_BUY_INSTANT_SELL = 'instant_buy_instant_sell'
}

export interface CraftFlippingOpportunity {
    itemName: string;
    ingredientCost: number;
    sellPrice: number;
    profitMargin: number;
    profitPercentage: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    priceVolatility: number;
    recommendationScore: number;
    maxCraftable: number;
    totalProfit: number;
    budget: number;
}

export class CraftingService {
    /**
     * Calculates profit for crafting a specific item with a given budget
     */
    static async calculateCraftingProfit(
        itemName: string, 
        budget: number, 
        pricingStrategy: PricingStrategy = PricingStrategy.BUY_ORDER_SELL_ORDER
    ): Promise<CraftingCalculation & { depthAnalysis?: { usedDepthAware: boolean; estimatedCrafts?: number; feasible: boolean } }> {
        // Get recipe for the item
        const recipe = RecipeDatabase.getRecipe(itemName);
        if (!recipe) {
            throw new Error(`${ERROR_MESSAGES.RECIPE_NOT_FOUND}: ${itemName}`);
        }
        
        // Get all ingredient IDs
        const ingredientIds = Object.keys(recipe.ingredients);
        const allItemIds = [...ingredientIds, recipe.result.item];
        
        // Check if we need depth-aware pricing for instant strategies
        const needsDepthAwareness = pricingStrategy === PricingStrategy.INSTANT_BUY_SELL_ORDER || 
                                   pricingStrategy === PricingStrategy.INSTANT_BUY_INSTANT_SELL ||
                                   pricingStrategy === PricingStrategy.BUY_ORDER_INSTANT_SELL;

        let prices: Record<string, { ingredientPrice: number; resultPrice: number; feasible?: boolean; maxPossibleCrafts?: number }>;
        let depthAnalysis: { usedDepthAware: boolean; estimatedCrafts?: number; feasible: boolean } = {
            usedDepthAware: false,
            feasible: true
        };
        
        if (needsDepthAwareness) {
            // Calculate quantities needed based on budget
            const quantities: Record<string, number> = {};
            
            // Estimate how many crafts we could do with the budget
            // First get simple prices to estimate ingredient cost
            const simplePrices = await HypixelService.getMultipleItemPricesWithStrategy(allItemIds, pricingStrategy);
            let totalIngredientCost = 0;
            
            for (const [ingredientId, quantity] of Object.entries(recipe.ingredients)) {
                totalIngredientCost += (simplePrices[ingredientId]?.ingredientPrice || 0) * Number(quantity);
            }
            
            const estimatedCrafts = totalIngredientCost > 0 ? Math.max(1, Math.floor(budget / totalIngredientCost)) : 1;
            
            // Set quantities for depth-aware calculation
            quantities[recipe.result.item] = recipe.result.count * estimatedCrafts;
            for (const [ingredientId, quantity] of Object.entries(recipe.ingredients)) {
                quantities[ingredientId] = Number(quantity) * estimatedCrafts;
            }
            
            Logger.verbose(`🔍 Using depth-aware pricing for ${itemName} with estimated ${estimatedCrafts} crafts`);
            Logger.verbose(`⚠️ IMPORTANT: Instant buy prices include Hypixel's 4% surcharge for market stability`);
            prices = await HypixelService.getDepthAwarePricing(allItemIds, pricingStrategy, quantities);
            
            // Check market limitations and adjust max crafts if needed
            let maxCraftsByMarket = estimatedCrafts;
            let marketLimitedBy: string[] = [];
            
            // Check ingredient market limitations
            for (const [ingredientId, quantity] of Object.entries(recipe.ingredients)) {
                const ingredientPricing = prices[ingredientId];
                if (ingredientPricing?.maxPossibleCrafts !== undefined) {
                    const maxCraftsForThisIngredient = Math.floor(ingredientPricing.maxPossibleCrafts / Number(quantity));
                    if (maxCraftsForThisIngredient < maxCraftsByMarket) {
                        maxCraftsByMarket = maxCraftsForThisIngredient;
                        marketLimitedBy.push(`${ingredientId} (ingredient)`);
                    }
                }
            }
            
            // Check result market limitations
            const resultPricing = prices[recipe.result.item];
            if (resultPricing?.maxPossibleCrafts !== undefined) {
                const maxCraftsForResult = Math.floor(resultPricing.maxPossibleCrafts / recipe.result.count);
                if (maxCraftsForResult < maxCraftsByMarket) {
                    maxCraftsByMarket = maxCraftsForResult;
                    marketLimitedBy.push(`${recipe.result.item} (result)`);
                }
            }
            
            if (marketLimitedBy.length > 0) {
                Logger.verbose(`⚠️ Market depth limits crafting to ${maxCraftsByMarket} items (limited by: ${marketLimitedBy.join(', ')})`);
            }
            
            // Check feasibility - now always feasible since we adjust quantities
            const allFeasible = Object.values(prices).every(p => !p.hasOwnProperty('feasible') || p.feasible !== false);
            
            depthAnalysis = {
                usedDepthAware: true,
                estimatedCrafts: maxCraftsByMarket,
                feasible: allFeasible && maxCraftsByMarket > 0
            };
        } else {
            // Use simple pricing for order-based strategies
            prices = await HypixelService.getMultipleItemPricesWithStrategy(allItemIds, pricingStrategy);
        }
        
        const baseCalculation = this.calculateCraftingProfitWithPrices(
            itemName, 
            budget, 
            recipe, 
            prices, 
            pricingStrategy,
            depthAnalysis.usedDepthAware ? depthAnalysis.estimatedCrafts : undefined
        );
        
        return {
            ...baseCalculation,
            depthAnalysis
        };
    }

    /**
     * Calculates profit for crafting with pre-fetched price data (optimized for bulk operations)
     */
    static calculateCraftingProfitWithPrices(
        itemName: string, 
        budget: number, 
        recipe: any, 
        prices: Record<string, { ingredientPrice: number; resultPrice: number; feasible?: boolean; maxPossibleCrafts?: number }>,
        pricingStrategy: PricingStrategy = PricingStrategy.BUY_ORDER_SELL_ORDER,
        maxCraftsByMarket?: number // Override for market depth limitations
    ): CraftingCalculation {
        // Calculate ingredient costs using pricing strategy
        const ingredientCosts: Record<string, { price: number; quantity: number; total: number }> = {};
        let totalIngredientCost = 0;
        
        Logger.verbose(`\n💰 CRAFTING COST BREAKDOWN for ${itemName}:`);
        
        for (const [ingredientId, quantity] of Object.entries(recipe.ingredients)) {
            // Use the ingredient price directly from the strategy-aware prices
            const price = prices[ingredientId]?.ingredientPrice || 0;
            
            const quantityNum = Number(quantity);
            const total = price * quantityNum;
            
            Logger.verbose(`   ${ingredientId}: ${quantityNum}x @ ${price.toFixed(2)} = ${total.toLocaleString()} coins`);
            
            ingredientCosts[ingredientId] = {
                price,
                quantity: quantityNum,
                total
            };
            
            totalIngredientCost += total;
        }
        
        // Get selling price of the crafted item from strategy-aware prices
        const sellingPrice = prices[recipe.result.item]?.resultPrice || 0;
        
        Logger.verbose(`   📤 Sell ${recipe.result.item}: ${recipe.result.count}x @ ${sellingPrice.toFixed(2)} = ${(sellingPrice * recipe.result.count).toLocaleString()} coins`);
        Logger.verbose(`   📊 Total ingredient cost: ${totalIngredientCost.toLocaleString()} coins`);
        Logger.verbose(`   📈 Profit per craft: ${((sellingPrice * recipe.result.count) - totalIngredientCost).toLocaleString()} coins`);
        
        // Calculate profit per item
        const profitPerItem = (sellingPrice * recipe.result.count) - totalIngredientCost;
        
        // Calculate how many items can be crafted with the budget
        const budgetBasedMax = totalIngredientCost > 0 ? Math.floor(budget / totalIngredientCost) : 0;
        
        // Use market limitation if provided and it's more restrictive
        const maxCraftable = maxCraftsByMarket !== undefined ? 
            Math.min(budgetBasedMax, maxCraftsByMarket) : 
            budgetBasedMax;
                        
        Logger.verbose(`   💼 Budget allows: ${budgetBasedMax} crafts`);
        if (maxCraftsByMarket !== undefined) {
            Logger.verbose(`   📊 Market limits: ${maxCraftsByMarket} crafts`);
        }
        Logger.verbose(`   🎯 Final max craftable: ${maxCraftable} crafts`);

        
        // Calculate total profit
        const totalProfit = profitPerItem * maxCraftable;
        
        Logger.verbose(`   💎 Total profit: ${totalProfit.toLocaleString()} coins\n`);
        
        // Calculate profit percentage
        const profitPercentage = totalIngredientCost > 0 ? (profitPerItem / totalIngredientCost) * 100 : 0;
        
        return {
            itemName,
            budget,
            ingredientCosts,
            totalIngredientCost,
            sellingPrice,
            profitPerItem,
            maxCraftable,
            totalProfit,
            profitPercentage
        };
    }

    /**
     * Analyzes all crafting opportunities for flipping with the given budget (optimized - single API call)
     */
    static async analyzeCraftingOpportunities(
        includeRisky: boolean,
        budget: number = 10000000, // Default 10M budget
        pricingStrategy: PricingStrategy = PricingStrategy.BUY_ORDER_SELL_ORDER
    ): Promise<CraftFlippingOpportunity[]> {
        // Fetch all bazaar data once
        const bazaarData = await HypixelService.getBazaarPrices();
        const allRecipes = RecipeDatabase.getAllRecipes();
        const opportunities: CraftFlippingOpportunity[] = [];

        // Get all unique item IDs that we need prices for
        const allItemIds = new Set<string>();
        Object.entries(allRecipes).forEach(([itemName, recipe]) => {
            // Add result item
            allItemIds.add(itemName);
            // Add all ingredients
            Object.keys(recipe.ingredients).forEach(ingredient => allItemIds.add(ingredient));
        });

        // Check if we need depth-aware pricing for instant strategies
        const needsDepthAwareness = pricingStrategy === PricingStrategy.INSTANT_BUY_SELL_ORDER || 
                                   pricingStrategy === PricingStrategy.INSTANT_BUY_INSTANT_SELL ||
                                   pricingStrategy === PricingStrategy.BUY_ORDER_INSTANT_SELL;

        let prices: Record<string, { ingredientPrice: number; resultPrice: number; feasible?: boolean; maxPossibleCrafts?: number }>;
        
        if (needsDepthAwareness) {
            // Calculate quantities needed for ingredients based on budget
            const quantities: Record<string, number> = {};
            
            // For depth-aware pricing, we need to estimate quantities
            // We'll use a reasonable batch size for calculations
            const estimatedCrafts = 100; // Estimate quantity for 100 crafts
            
            Object.entries(allRecipes).forEach(([itemName, recipe]) => {
                // Add estimated quantity for result item
                quantities[itemName] = recipe.result.count * estimatedCrafts;
                
                // Add estimated quantities for ingredients
                Object.entries(recipe.ingredients).forEach(([ingredientId, ingredientQuantity]) => {
                    quantities[ingredientId] = Number(ingredientQuantity) * estimatedCrafts;
                });
            });
            
            Logger.verbose(`🔍 Using depth-aware pricing for ${pricingStrategy} strategy with estimated quantities`);
            prices = await HypixelService.getDepthAwarePricing(Array.from(allItemIds), pricingStrategy, quantities);
        } else {
            // Use simple pricing for order-based strategies
            prices = await HypixelService.getMultipleItemPricesWithStrategy(Array.from(allItemIds), pricingStrategy);
        }

        for (const [itemName, recipe] of Object.entries(allRecipes)) {
            try {
                // Calculate market limitations if using depth-aware pricing
                let maxCraftsByMarket: number | undefined;
                
                if (needsDepthAwareness) {
                    maxCraftsByMarket = 100; // Start with the estimated crafts value used above
                    
                    // Check ingredient market limitations
                    for (const [ingredientId, quantity] of Object.entries(recipe.ingredients)) {
                        const ingredientPricing = prices[ingredientId];
                        if (ingredientPricing?.maxPossibleCrafts !== undefined) {
                            const maxCraftsForThisIngredient = Math.floor(ingredientPricing.maxPossibleCrafts / Number(quantity));
                            maxCraftsByMarket = Math.min(maxCraftsByMarket!, maxCraftsForThisIngredient);
                        }
                    }
                    
                    // Check result market limitations
                    const resultPricing = prices[recipe.result.item];
                    if (resultPricing?.maxPossibleCrafts !== undefined) {
                        const maxCraftsForResult = Math.floor(resultPricing.maxPossibleCrafts / recipe.result.count);
                        maxCraftsByMarket = Math.min(maxCraftsByMarket!, maxCraftsForResult);
                    }
                }
                
                // Use optimized calculation with pre-fetched prices and market limitations
                const craftingCalc = this.calculateCraftingProfitWithPrices(itemName, budget, recipe, prices, pricingStrategy, maxCraftsByMarket);
                
                // Skip if not profitable, can't craft any items, or not feasible with depth-aware pricing
                const resultPricing = prices[recipe.result.item];
                const isFeasible = !resultPricing?.hasOwnProperty('feasible') || resultPricing.feasible !== false;
                
                if (craftingCalc.maxCraftable === 0 || !isFeasible) {
                    if (!isFeasible) {
                        Logger.verbose(`⚠️ Skipping ${itemName}: insufficient order book depth for instant strategy`);
                    }
                    continue;
                }

                // Get volatility data for risk assessment
                const product = bazaarData.products[itemName];
                if (!product) {
                    continue;
                }

                const priceVolatility = this.calculatePriceVolatility(product);
                const riskLevel = this.determineRiskLevel(craftingCalc.profitPercentage, priceVolatility);
                
                // Filter out high-risk items unless specifically requested
                if (!includeRisky && riskLevel === 'HIGH') {
                    continue;
                }

                const recommendationScore = this.calculateRecommendationScore(
                    craftingCalc.profitPerItem,
                    craftingCalc.profitPercentage,
                    riskLevel,
                    priceVolatility,
                    craftingCalc.totalProfit
                );

                opportunities.push({
                    itemName,
                    ingredientCost: craftingCalc.totalIngredientCost,
                    sellPrice: craftingCalc.sellingPrice,
                    profitMargin: craftingCalc.profitPerItem,
                    profitPercentage: craftingCalc.profitPercentage,
                    riskLevel,
                    priceVolatility,
                    recommendationScore,
                    maxCraftable: craftingCalc.maxCraftable,
                    totalProfit: craftingCalc.totalProfit,
                    budget: craftingCalc.budget
                });

            } catch (error) {
                // Skip items that can't be calculated (missing ingredients, etc.)
                continue;
            }
        }

        // Sort by recommendation score (descending)
        opportunities.sort((a, b) => b.recommendationScore - a.recommendationScore);
        
        return opportunities;
    }

    private static calculatePriceVolatility(product: any): number {
        const { quick_status, buy_orders, sell_orders } = product;
        
        // Need both instant and weighted data to calculate volatility
        if (!buy_orders?.[0]?.pricePerUnit || !sell_orders?.[0]?.pricePerUnit || 
            !quick_status?.buyPrice || !quick_status?.sellPrice) {
            return 0;
        }
        
        // Using intuitive field names! buy_orders = actual buy orders, sell_orders = actual sell orders
        // Compare instant vs weighted average prices
        const instantBuyPrice = buy_orders[0].pricePerUnit;      // Instant sell price (highest buy order)
        const instantSellPrice = sell_orders[0].pricePerUnit;    // Instant buy price (lowest sell order)
        const weightedBuyPrice = quick_status.sellPrice;         // Weighted average sell price (what you pay to buy)
        const weightedSellPrice = quick_status.buyPrice;         // Weighted average buy price (what you get when selling)
        
        const buyPriceDiff = Math.abs(instantSellPrice - weightedBuyPrice) / weightedBuyPrice * 100;
        const sellPriceDiff = Math.abs(instantBuyPrice - weightedSellPrice) / weightedSellPrice * 100;
        
        return (buyPriceDiff + sellPriceDiff) / 2;
    }

    /**
     * Determine risk level based on profit percentage and price volatility
     */
    private static determineRiskLevel(profitPercentage: number, priceVolatility: number): 'LOW' | 'MEDIUM' | 'HIGH' {
        // High risk if high volatility (uncertain market value)
        if (priceVolatility > FLIPPING_ANALYSIS.HIGH_VOLATILITY_THRESHOLD) {
            return 'HIGH';
        }
        
        // Medium risk for moderate volatility
        if (priceVolatility > FLIPPING_ANALYSIS.MEDIUM_VOLATILITY_THRESHOLD) {
            return 'MEDIUM';
        }
        
        // Low risk for stable prices and good margins
        if (profitPercentage >= FLIPPING_ANALYSIS.MEDIUM_MARGIN_THRESHOLD && 
            priceVolatility <= FLIPPING_ANALYSIS.LOW_VOLATILITY_THRESHOLD) {
            return 'LOW';
        }
        
        return 'MEDIUM';
    }

    /**
     * Calculate recommendation score based on total profit only
     */
    private static calculateRecommendationScore(
        profitMargin: number,
        profitPercentage: number,
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
        priceVolatility: number,
        totalProfit: number
    ): number {
        // Only total profit matters - pure profit-based ranking
        return totalProfit;
    }
    
    /**
     * Gets all available recipes
     */
    static getAvailableRecipes(): string[] {
        return RecipeDatabase.getAllRecipeNames();
    }
    
    /**
     * Searches for recipes by item name (partial matching)
     */
    static searchRecipes(searchTerm: string): string[] {
        return RecipeDatabase.searchRecipes(searchTerm);
    }
}
