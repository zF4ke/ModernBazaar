import { BazaarResponse, BazaarProduct } from "../types";
import { HypixelService } from "./hypixel";
import { formatFullNumber, formatItemName } from "../utils/formatting";
import { FLIPPING_ANALYSIS, MARKET_ANALYSIS } from "../constants";

export interface FlippingOpportunity {
    itemId: string;
    buyPrice: number;
    sellPrice: number;
    profitMargin: number;
    profitPercentage: number;
    buyVolume: number;
    sellVolume: number;
    liquidityScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendationScore: number;
    priceType: 'instant' | 'weighted';
    weeklyBuyMovement: number;
    weeklySellMovement: number;
}

export class FlippingService {
    /**
     * Analyzes all bazaar items and returns the best flipping opportunities
     */
    static async getBestFlippingOpportunities(maxResults: number = FLIPPING_ANALYSIS.MAX_RESULTS, priceType: 'instant' | 'weighted' = 'instant'): Promise<FlippingOpportunity[]> {
        const bazaarData = await HypixelService.getBazaarPrices();
        const opportunities: FlippingOpportunity[] = [];

        for (const [itemId, product] of Object.entries(bazaarData.products)) {
            const opportunity = this.analyzeFlippingOpportunity(itemId, product, priceType);
            
            if (opportunity && this.isViableOpportunity(opportunity)) {
                opportunities.push(opportunity);
            }
        }

        // Sort by recommendation score (descending)
        opportunities.sort((a, b) => b.recommendationScore - a.recommendationScore);
        
        return opportunities.slice(0, maxResults);
    }

    private static analyzeFlippingOpportunity(itemId: string, product: BazaarProduct, priceType: 'instant' | 'weighted' = 'instant'): FlippingOpportunity | null {
        const { quick_status, buy_orders, sell_orders } = product;
        
        let buyPrice: number;
        let sellPrice: number;
        
        if (priceType === 'instant') {
            // Use order book prices for realistic flipping (place orders and wait)
            // buyPrice = what you pay placing a buy order (compete with other buy orders)
            // sellPrice = what you get placing a sell order (compete with other sell orders)
            if (!buy_orders?.[0]?.pricePerUnit || !sell_orders?.[0]?.pricePerUnit) {
                return null;
            }
            buyPrice = buy_orders[0].pricePerUnit;   // Highest buy order price (what you pay to place competitive buy order)
            sellPrice = sell_orders[0].pricePerUnit; // Lowest sell order price (what you get to place competitive sell order)
        } else {
            // Use weighted average prices (top 2% by volume)
            if (!quick_status.buyPrice || !quick_status.sellPrice || quick_status.buyPrice <= 0 || quick_status.sellPrice <= 0) {
                return null;
            }
            buyPrice = quick_status.sellPrice; // Weighted average sell price (what you pay)
            sellPrice = quick_status.buyPrice; // Weighted average buy price (what you get)
        }
        
        // Skip items without valid prices or negative margins
        if (buyPrice <= 0 || sellPrice <= 0 || sellPrice <= buyPrice) {
            return null;
        }
        
        const profitMargin = sellPrice - buyPrice;
        const profitPercentage = (profitMargin / buyPrice) * 100;

        // Skip if not profitable
        if (profitMargin <= 0) {
            return null;
        }

        const buyVolume = quick_status.sellVolume;
        const sellVolume = quick_status.buyVolume;
        
        // Calculate liquidity score (0-100)
        const liquidityScore = this.calculateLiquidityScore(buyVolume, sellVolume);
        
        // Calculate price volatility indicator (difference between instant vs weighted avg)
        const priceVolatility = this.calculatePriceVolatility(product, priceType);
        
        // Determine risk level (now includes price volatility)
        const riskLevel = this.determineRiskLevel(profitPercentage, liquidityScore, buyVolume, sellVolume, priceVolatility);
        
        // Calculate overall recommendation score
        const recommendationScore = this.calculateRecommendationScore(
            profitMargin,
            profitPercentage,
            liquidityScore,
            riskLevel
        );

        return {
            itemId,
            buyPrice,
            sellPrice,
            profitMargin,
            profitPercentage,
            buyVolume,
            sellVolume,
            liquidityScore,
            riskLevel,
            recommendationScore,
            priceType,
            weeklyBuyMovement: quick_status.buyMovingWeek || 0,
            weeklySellMovement: quick_status.sellMovingWeek
        };
    }

    /**
     * Calculates a liquidity score based on buy and sell volumes
     */
    private static calculateLiquidityScore(buyVolume: number, sellVolume: number): number {
        const totalVolume = buyVolume + sellVolume;
        const balanceRatio = Math.min(buyVolume, sellVolume) / Math.max(buyVolume, sellVolume);
        
        // Base score from total volume
        let score = Math.min(totalVolume / FLIPPING_ANALYSIS.LIQUIDITY_SCORE_VOLUME_DIVISOR, 1) * FLIPPING_ANALYSIS.LIQUIDITY_SCORE_MAX_VOLUME_POINTS;
        
        // Bonus for balanced buy/sell volumes
        score += balanceRatio * FLIPPING_ANALYSIS.LIQUIDITY_SCORE_MAX_BALANCE_POINTS;
        
        // Bonus for minimum viable volume
        if (totalVolume >= FLIPPING_ANALYSIS.PREFERRED_VOLUME_THRESHOLD) {
            score += FLIPPING_ANALYSIS.LIQUIDITY_SCORE_PREFERRED_VOLUME_BONUS;
        }
        
        return Math.min(score, 100);
    }

    /**
     * Determines risk level based on various factors including price volatility
     */
    private static determineRiskLevel(
        profitPercentage: number,
        liquidityScore: number,
        buyVolume: number,
        sellVolume: number,
        priceVolatility: number
    ): 'LOW' | 'MEDIUM' | 'HIGH' {
        // High risk factors
        if (liquidityScore < FLIPPING_ANALYSIS.LOW_LIQUIDITY_THRESHOLD || 
            buyVolume < FLIPPING_ANALYSIS.MIN_VOLUME_FOR_RECOMMENDATION || 
            sellVolume < FLIPPING_ANALYSIS.MIN_VOLUME_FOR_RECOMMENDATION ||
            priceVolatility > FLIPPING_ANALYSIS.HIGH_VOLATILITY_THRESHOLD) { // High price volatility indicates uncertain market value
            return 'HIGH';
        }
        
        // Medium risk if moderate volatility or other concerning factors
        if (priceVolatility > FLIPPING_ANALYSIS.MEDIUM_VOLATILITY_THRESHOLD || 
            liquidityScore < FLIPPING_ANALYSIS.MEDIUM_LIQUIDITY_THRESHOLD) {
            return 'MEDIUM';
        }
        
        // Low risk factors - stable prices and good liquidity
        if (profitPercentage >= FLIPPING_ANALYSIS.MEDIUM_MARGIN_THRESHOLD && 
            liquidityScore >= FLIPPING_ANALYSIS.HIGH_LIQUIDITY_THRESHOLD && 
            priceVolatility <= FLIPPING_ANALYSIS.LOW_VOLATILITY_THRESHOLD) { // Low volatility = stable, known market value
            return 'LOW';
        }
        
        return 'MEDIUM';
    }

    /**
     * Calculates overall recommendation score (0-100)
     */
    private static calculateRecommendationScore(
        profitMargin: number,
        profitPercentage: number,
        liquidityScore: number,
        riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    ): number {
        let score = 0;
        
        // Profit margin contribution (0-30 points)
        score += Math.min(profitMargin / 100000, 1) * 30;
        
        // Profit percentage contribution (0-40 points)
        score += Math.min(profitPercentage / FLIPPING_ANALYSIS.HIGH_MARGIN_THRESHOLD, 1) * 40;
        
        // Liquidity contribution (0-20 points)
        score += (liquidityScore / 100) * 20;
        
        // Risk adjustment
        const riskMultiplier = riskLevel === 'LOW' ? 1.0 : riskLevel === 'MEDIUM' ? 0.8 : 0.5;
        score *= riskMultiplier;
        
        return Math.min(score, 100);
    }

    /**
     * Checks if an opportunity meets minimum viability criteria
     */
    private static isViableOpportunity(opportunity: FlippingOpportunity): boolean {
        return opportunity.profitMargin >= FLIPPING_ANALYSIS.MIN_PROFIT_MARGIN &&
               opportunity.profitPercentage >= FLIPPING_ANALYSIS.MIN_PROFIT_PERCENTAGE &&
               opportunity.buyVolume >= FLIPPING_ANALYSIS.MIN_VOLUME_FOR_RECOMMENDATION;
    }

    /**
     * Gets flipping opportunities for a specific category (high margin, high volume, etc.)
     */
    static async getFlippingOpportunitiesByCategory(category: 'high-margin' | 'high-volume' | 'low-risk', priceType: 'instant' | 'weighted' = 'instant'): Promise<FlippingOpportunity[]> {
        const allOpportunities = await this.getBestFlippingOpportunities(50, priceType);
        
        switch (category) {
            case 'high-margin':
                return allOpportunities
                    .filter(op => op.profitPercentage >= FLIPPING_ANALYSIS.HIGH_MARGIN_THRESHOLD)
                    .slice(0, FLIPPING_ANALYSIS.MAX_RESULTS);
            
            case 'high-volume':
                return allOpportunities
                    .filter(op => op.liquidityScore >= 70)
                    .sort((a, b) => (b.buyVolume + b.sellVolume) - (a.buyVolume + a.sellVolume))
                    .slice(0, FLIPPING_ANALYSIS.MAX_RESULTS);
            
            case 'low-risk':
                return allOpportunities
                    .filter(op => op.riskLevel === 'LOW')
                    .slice(0, FLIPPING_ANALYSIS.MAX_RESULTS);
            
            default:
                return allOpportunities;
        }
    }

    /**
     * Calculates price volatility by comparing instant vs weighted average prices
     * High volatility indicates market uncertainty (new items, trending, etc.)
     */
    private static calculatePriceVolatility(product: BazaarProduct, currentPriceType: 'instant' | 'weighted'): number {
        const { quick_status, buy_orders, sell_orders } = product;
        
        // Need both instant and weighted data to calculate volatility
        if (!buy_orders?.[0]?.pricePerUnit || !sell_orders?.[0]?.pricePerUnit || 
            !quick_status.buyPrice || !quick_status.sellPrice) {
            return 0; // No volatility data available
        }
        
        // Get order book prices for flipping (what you pay/get placing orders)
        const orderBuyPrice = buy_orders[0].pricePerUnit;   // What you pay placing buy orders (highest buy order)
        const orderSellPrice = sell_orders[0].pricePerUnit; // What you get placing sell orders (lowest sell order)
        
        // Get weighted average prices
        const weightedBuyPrice = quick_status.sellPrice; // Weighted average sell price (what you pay to buy)
        const weightedSellPrice = quick_status.buyPrice; // Weighted average buy price (what you get when selling)
        
        // Calculate percentage differences between order book and weighted prices
        const buyPriceDiff = Math.abs(orderBuyPrice - weightedBuyPrice) / weightedBuyPrice * 100;
        const sellPriceDiff = Math.abs(orderSellPrice - weightedSellPrice) / weightedSellPrice * 100;
        
        // Return average volatility percentage
        return (buyPriceDiff + sellPriceDiff) / 2;
    }
}
