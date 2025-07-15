import { Recipe, CraftingCalculation } from "../types";
import { HypixelService } from "./hypixel";
import { RecipeDatabase } from "../data/recipes";
import { ERROR_MESSAGES, FLIPPING_ANALYSIS } from "../constants";

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
    ): Promise<CraftingCalculation> {
        // Get recipe for the item
        const recipe = RecipeDatabase.getRecipe(itemName);
        if (!recipe) {
            throw new Error(`${ERROR_MESSAGES.RECIPE_NOT_FOUND}: ${itemName}`);
        }
        
        // Get all ingredient IDs
        const ingredientIds = Object.keys(recipe.ingredients);
        
        // Fetch current bazaar prices for all ingredients and the result item
        const allItemIds = [...ingredientIds, recipe.result.item];
        const prices = await HypixelService.getMultipleItemPrices(allItemIds);
        
        return this.calculateCraftingProfitWithPrices(itemName, budget, recipe, prices, pricingStrategy);
    }

    /**
     * Calculates profit for crafting with pre-fetched price data (optimized for bulk operations)
     */
    static calculateCraftingProfitWithPrices(
        itemName: string, 
        budget: number, 
        recipe: any, 
        prices: Record<string, { buyPrice: number; sellPrice: number }>,
        pricingStrategy: PricingStrategy = PricingStrategy.BUY_ORDER_SELL_ORDER
    ): CraftingCalculation {
        // Calculate ingredient costs using pricing strategy
        const ingredientCosts: Record<string, { price: number; quantity: number; total: number }> = {};
        let totalIngredientCost = 0;
        
        for (const [ingredientId, quantity] of Object.entries(recipe.ingredients)) {
            // Choose price based on strategy for buying ingredients
            let price = 0;
            if (pricingStrategy === PricingStrategy.BUY_ORDER_SELL_ORDER || pricingStrategy === PricingStrategy.BUY_ORDER_INSTANT_SELL) {
                // Use sellPrice for ingredients - we place buy orders at current sell order prices
                price = prices[ingredientId]?.sellPrice || 0;
            } else {
                // Use buyPrice for ingredients - we instant buy at current buy order prices
                price = prices[ingredientId]?.buyPrice || 0;
            }
            
            const quantityNum = Number(quantity);
            const total = price * quantityNum;
            
            ingredientCosts[ingredientId] = {
                price,
                quantity: quantityNum,
                total
            };
            
            totalIngredientCost += total;
        }
        
        // Get selling price of the crafted item based on strategy
        let sellingPrice = 0;
        if (pricingStrategy === PricingStrategy.BUY_ORDER_SELL_ORDER || pricingStrategy === PricingStrategy.INSTANT_BUY_SELL_ORDER) {
            // Use buyPrice - what others are willing to pay when we place sell orders
            sellingPrice = prices[recipe.result.item]?.buyPrice || 0;
        } else {
            // Use sellPrice - instant sell to current buy orders
            sellingPrice = prices[recipe.result.item]?.sellPrice || 0;
        }
        
        // Calculate profit per item
        const profitPerItem = (sellingPrice * recipe.result.count) - totalIngredientCost;
        
        // Calculate how many items can be crafted with the budget
        const maxCraftable = totalIngredientCost > 0 ? Math.floor(budget / totalIngredientCost) : 0;
        
        // Calculate total profit
        const totalProfit = profitPerItem * maxCraftable;
        
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

        // Fetch all prices at once
        const prices = await HypixelService.getMultipleItemPrices(Array.from(allItemIds));

        for (const [itemName, recipe] of Object.entries(allRecipes)) {
            try {
                // Use optimized calculation with pre-fetched prices
                const craftingCalc = this.calculateCraftingProfitWithPrices(itemName, budget, recipe, prices, pricingStrategy);
                
                // Skip if not profitable or can't craft any items with the budget
                if (/* craftingCalc.profitPerItem <= 0 || */ craftingCalc.maxCraftable === 0) {
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

    /**
     * Calculate price volatility between instant and weighted prices
     */
    private static calculatePriceVolatility(product: any): number {
        const { quick_status, buy_summary, sell_summary } = product;
        
        // Need both instant and weighted data to calculate volatility
        if (!buy_summary?.[0]?.pricePerUnit || !sell_summary?.[0]?.pricePerUnit || 
            !quick_status?.buyPrice || !quick_status?.sellPrice) {
            return 0;
        }
        
        // Compare instant vs weighted average prices
        const instantBuyPrice = sell_summary[0].pricePerUnit;
        const instantSellPrice = buy_summary[0].pricePerUnit;
        const weightedBuyPrice = quick_status.sellPrice;
        const weightedSellPrice = quick_status.buyPrice;
        
        const buyPriceDiff = Math.abs(instantBuyPrice - weightedBuyPrice) / weightedBuyPrice * 100;
        const sellPriceDiff = Math.abs(instantSellPrice - weightedSellPrice) / weightedSellPrice * 100;
        
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
