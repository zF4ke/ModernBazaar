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

export interface EnhancedFlippingOpportunity extends FlippingOpportunity {
    maxAffordable?: number;
    totalPotentialProfit?: number;
    estimatedItemsPerHour: number;
    estimatedProfitPerHour: number;
    budgetLimited: boolean;
    flipScore: number;
    competitionScore: number;
    competitionAwareFlipScore: number;
}

export class FlippingService {
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

        const buyVolume = quick_status.totalItemsInBuyOrders;
        const sellVolume = quick_status.totalItemsInSellOrders;
        
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

    /**
     * Enhanced flipping opportunities with pagination and advanced sorting
     */
    static async findFlippingOpportunities(
        budget: number | null,
        page: number = 1,
        itemsPerPage: number = 5,
        strategy: 'orderbook' | 'instant' = 'orderbook',
        forceRefresh: boolean = false,
        sortBy: 'flipScore' | 'competitionAwareFlipScore' | 'competition' | 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'profitPerHour' | 'instabuyVolume' | 'instasellVolume' | 'instaboughtPerHour' | 'instasoldPerHour' | 'riskLevel' = 'flipScore'
    ): Promise<{ opportunities: EnhancedFlippingOpportunity[], totalCount: number, totalPages: number, currentPage: number, totalProfit: number }> {
        
        const bazaarData = await HypixelService.getBazaarPrices();
        const allOpportunities: EnhancedFlippingOpportunity[] = [];

        // Analyze all items
        for (const [itemId, product] of Object.entries(bazaarData.products)) {
            const priceType = strategy === 'orderbook' ? 'instant' : 'weighted';
            const opportunity = this.analyzeFlippingOpportunity(itemId, product, priceType);
            
            if (opportunity && this.isViableOpportunity(opportunity)) {
                // Enhanced scoring with competition analysis
                const enhancedOpportunity = this.enhanceOpportunityWithCompetition(opportunity, product, budget);
                
                // Filter out items with very low trading potential (less than 1 item per hour)
                if (enhancedOpportunity.estimatedItemsPerHour < 1) {
                    continue;
                }
                
                // Filter out high risk items
                if (enhancedOpportunity.riskLevel === 'HIGH') {
                    continue;
                }
                
                allOpportunities.push(enhancedOpportunity);
            }
        }

        // Sort opportunities according to the specified criteria
        const sortedOpportunities = this.sortFlippingOpportunities(allOpportunities, sortBy, budget);

        // Calculate total profit across all opportunities
        const totalProfit = budget ? 
            sortedOpportunities.reduce((sum, opp) => {
                const maxAffordable = Math.floor(budget / opp.buyPrice);
                return sum + (maxAffordable * opp.profitMargin);
            }, 0) :
            sortedOpportunities.reduce((sum, opp) => sum + opp.profitMargin, 0);

        // Calculate pagination
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
            totalProfit
        };
    }

    /**
     * Enhanced scoring for flipping opportunities (heavily prioritizes volume over margins)
     */
    private static enhanceOpportunityScoring(opportunity: FlippingOpportunity, budget: number | null): {
        estimatedItemsPerHour: number;
        estimatedProfitPerHour: number;
        budgetLimited: boolean;
        flipScore: number;
        maxAffordable?: number;
        totalPotentialProfit?: number;
    } {
        // Calculate realistic trading capacity per hour
        const hourlyBuyVolume = opportunity.weeklyBuyMovement / 168; // Convert weekly to hourly
        const hourlySellVolume = opportunity.weeklySellMovement / 168;
        
        // Realistic trading rate: you can trade up to the smaller volume, but account for market share
        // Assume you can capture 10-30% of the market volume depending on your activity level
        const marketShareFactor = 0.2; // 20% market share assumption
        const realisticBuyRate = hourlyBuyVolume * marketShareFactor;
        const realisticSellRate = hourlySellVolume * marketShareFactor;
        
        // Your actual trading rate is limited by the slower of buying or selling
        let estimatedItemsPerHour = Math.min(realisticBuyRate, realisticSellRate);
        let budgetLimited = false;
        let maxAffordable: number | undefined;
        let totalPotentialProfit: number | undefined;
        
        // If budget is provided, cap by what you can afford per hour
        if (budget) {
            maxAffordable = Math.floor(budget / opportunity.buyPrice);
            // Skip items you can't afford even one of
            if (maxAffordable === 0) {
                return {
                    estimatedItemsPerHour: 0,
                    estimatedProfitPerHour: 0,
                    budgetLimited: true,
                    flipScore: 0,
                    maxAffordable: 0,
                    totalPotentialProfit: 0
                };
            }
            totalPotentialProfit = maxAffordable * opportunity.profitMargin;
            
            const maxAffordablePerHour = budget / opportunity.buyPrice; // Items you can afford with full budget
            if (maxAffordablePerHour < estimatedItemsPerHour) {
                estimatedItemsPerHour = maxAffordablePerHour;
                budgetLimited = true;
            }
        }
        
        // Calculate estimated profit per hour
        const estimatedProfitPerHour = estimatedItemsPerHour * opportunity.profitMargin;
        
        // Volume-focused flip score calculation
        // Profit per hour component (60% weight) - this is what actually matters
        const profitPerHourScore = Math.log10(estimatedProfitPerHour + 1) * 4; // 0-20 range typically
        
        // Volume component (25% weight) - trading velocity
        const volumeScore = Math.log10(estimatedItemsPerHour + 1) * 2; // 0-10 range typically
        
        // Profit efficiency component (15% weight) - profit per item
        const profitEfficiency = Math.log10(opportunity.profitMargin + 1) * 1.5; // 0-7.5 range typically
        
        // Combine with profit per hour being the primary factor
        const flipScore = profitPerHourScore + volumeScore + profitEfficiency;
        
        return {
            estimatedItemsPerHour,
            estimatedProfitPerHour,
            budgetLimited,
            flipScore,
            maxAffordable,
            totalPotentialProfit
        };
    }

    /**
     * Calculate competition score based on order book analysis
     * Detects patterns like: 1,354,821.5, 1,354,821.6, 1,354,821.7, etc.
     */
    private static calculateCompetitionScore(product: BazaarProduct): number {
        const { buy_orders, sell_orders } = product;
        
        if (!buy_orders || !sell_orders || buy_orders.length < 3 || sell_orders.length < 3) {
            return 10; // Default low competition if insufficient data
        }
        
        // Analyze buy order competition
        const buyCompetition = this.analyzeOrderCompetition(buy_orders);
        
        // Analyze sell order competition  
        const sellCompetition = this.analyzeOrderCompetition(sell_orders);
        
        // Combine scores with buy competition weighted more heavily (70% buy, 30% sell)
        const weightedCompetition = (buyCompetition * 0.7) + (sellCompetition * 0.3);
        
        return Math.max(0, Math.min(100, weightedCompetition));
    }

    /**
     * Analyzes a list of orders to detect competitive pricing patterns
     * Uses multiple strategies to detect different types of competition
     */
    private static analyzeOrderCompetition(orders: Array<{ pricePerUnit: number; amount: number }>): number {
        if (orders.length < 3) return 10;
        
        const prices = orders.slice(0, Math.min(20, orders.length)).map(order => order.pricePerUnit);
        
        // Strategy 1: Consecutive competitive pattern detection
        const consecutiveCompetition = this.detectConsecutiveCompetition(prices);
        
        // Strategy 2: Price gap analysis (big gaps = lower competition)
        const gapAnalysis = this.analyzePriceGaps(prices);
        
        // Strategy 3: Overall price spread analysis
        const spreadAnalysis = this.analyzePriceSpread(prices);
        
        // Strategy 4: Cluster analysis (small competitive clusters separated by gaps)
        const clusterAnalysis = this.analyzeCompetitiveClusters(prices);
        
        // Combine all strategies with weights
        const competitionScore = (
            consecutiveCompetition * 0.4 +  // 40% weight - direct competition
            gapAnalysis * 0.25 +           // 25% weight - gap analysis
            spreadAnalysis * 0.2 +         // 20% weight - overall spread
            clusterAnalysis * 0.15         // 15% weight - cluster detection
        );
        
        return Math.min(100, Math.max(5, competitionScore));
    }

    /**
     * Strategy 1: Detect consecutive competitive patterns
     */
    private static detectConsecutiveCompetition(prices: number[]): number {
        const topPrice = prices[0];
        const basePrice = Math.floor(topPrice * 10) / 10; // Remove last decimal place
        
        let competitiveOrders = 0;
        let expectedIncrement = 0.1;
        
        for (let i = 0; i < prices.length; i++) {
            const currentPrice = prices[i];
            const expectedPrice = basePrice + (i * expectedIncrement);
            const priceDifference = Math.abs(currentPrice - expectedPrice);
            
            if (priceDifference <= 0.05) {
                competitiveOrders++;
            } else {
                // Try different increment patterns
                const possibleIncrements = [0.1, 0.2, 0.3, 0.4, 0.5, 1.0];
                let foundPattern = false;
                
                for (const increment of possibleIncrements) {
                    const expectedWithIncrement = basePrice + (i * increment);
                    if (Math.abs(currentPrice - expectedWithIncrement) <= 0.05) {
                        expectedIncrement = increment;
                        competitiveOrders++;
                        foundPattern = true;
                        break;
                    }
                }
                
                if (!foundPattern) {
                    if (i > 2) break;
                    const percentageDiff = Math.abs(currentPrice - topPrice) / topPrice * 100;
                    if (percentageDiff < 1) {
                        competitiveOrders++;
                    } else {
                        break;
                    }
                }
            }
        }
        
        // Score consecutive competition
        let score = 0;
        if (competitiveOrders >= 5) {
            score = 95;
        } else if (competitiveOrders >= 4) {
            score = 85;
        } else if (competitiveOrders >= 3) {
            score = 75;
        } else if (competitiveOrders >= 2) {
            score = 60;
        } else {
            score = 15;
        }
        
        // Bonuses for tight increments
        if (expectedIncrement <= 0.2 && competitiveOrders >= 2) {
            score += 15;
        }
        if (expectedIncrement <= 0.1 && competitiveOrders >= 2) {
            score += 10;
        }
        
        return score;
    }

    /**
     * Strategy 2: Analyze price gaps (big gaps indicate lower competition)
     */
    private static analyzePriceGaps(prices: number[]): number {
        if (prices.length < 3) return 50;
        
        const gaps: number[] = [];
        for (let i = 1; i < Math.min(10, prices.length); i++) {
            const gap = Math.abs(prices[i-1] - prices[i]);
            const percentageGap = (gap / prices[i-1]) * 100;
            gaps.push(percentageGap);
        }
        
        // Count significant gaps (>0.5% price difference)
        const significantGaps = gaps.filter(gap => gap > 0.5).length;
        const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
        
        // More gaps and larger gaps = lower competition
        let gapScore = 50; // Base score
        
        if (significantGaps >= 3 && averageGap > 2.0) {
            gapScore = 20; // Very low competition - many big gaps
        } else if (significantGaps >= 2 && averageGap > 1.0) {
            gapScore = 35; // Low competition - some big gaps
        } else if (significantGaps >= 1 && averageGap > 0.5) {
            gapScore = 50; // Medium competition - few gaps
        } else if (averageGap < 0.1) {
            gapScore = 85; // High competition - very tight prices
        } else {
            gapScore = 70; // Moderate competition
        }
        
        return gapScore;
    }

    /**
     * Strategy 3: Analyze overall price spread
     */
    private static analyzePriceSpread(prices: number[]): number {
        if (prices.length < 3) return 50;
        
        const topPrice = prices[0];
        const lowestPrice = Math.min(...prices.slice(0, 10));
        const spreadPercentage = ((topPrice - lowestPrice) / topPrice) * 100;
        
        // Wider spread = lower competition
        if (spreadPercentage > 10) {
            return 20; // Very wide spread = very low competition
        } else if (spreadPercentage > 5) {
            return 35; // Wide spread = low competition
        } else if (spreadPercentage > 2) {
            return 50; // Medium spread = medium competition
        } else if (spreadPercentage > 0.5) {
            return 70; // Narrow spread = high competition
        } else {
            return 90; // Very narrow spread = very high competition
        }
    }

    /**
     * Strategy 4: Detect competitive clusters separated by gaps
     */
    private static analyzeCompetitiveClusters(prices: number[]): number {
        if (prices.length < 4) return 50;
        
        const clusters: number[][] = [];
        let currentCluster: number[] = [prices[0]];
        
        for (let i = 1; i < Math.min(15, prices.length); i++) {
            const gap = Math.abs(prices[i-1] - prices[i]);
            const percentageGap = (gap / prices[i-1]) * 100;
            
            if (percentageGap <= 0.3) {
                // Small gap - same cluster
                currentCluster.push(prices[i]);
            } else {
                // Big gap - new cluster
                if (currentCluster.length >= 2) {
                    clusters.push([...currentCluster]);
                }
                currentCluster = [prices[i]];
            }
        }
        
        // Add final cluster
        if (currentCluster.length >= 2) {
            clusters.push(currentCluster);
        }
        
        // Analyze cluster pattern
        if (clusters.length >= 3) {
            return 25; // Multiple small clusters = low competition
        } else if (clusters.length === 2) {
            return 40; // Two clusters = medium-low competition
        } else if (clusters.length === 1 && clusters[0].length >= 6) {
            return 80; // One big cluster = high competition
        } else if (clusters.length === 1 && clusters[0].length >= 3) {
            return 65; // One medium cluster = medium-high competition
        } else {
            return 45; // No clear clusters = medium competition
        }
    }

    /**
     * Enhanced scoring with competition awareness
     */
    private static enhanceOpportunityWithCompetition(opportunity: FlippingOpportunity, product: BazaarProduct, budget: number | null): EnhancedFlippingOpportunity {
        // First do the regular scoring
        const scoringResults = this.enhanceOpportunityScoring(opportunity, budget);
        
        // Calculate competition score
        const competitionScore = this.calculateCompetitionScore(product);
        
        // Create competition-aware flip score
        const originalFlipScore = scoringResults.flipScore;
        
        // Competition adjustment: lower competition = better for flipping
        // High competition (80-100) = 0.7x multiplier
        // Medium competition (40-60) = 0.9x multiplier  
        // Low competition (0-20) = 1.2x multiplier
        let competitionMultiplier = 1.0;
        if (competitionScore >= 80) {
            competitionMultiplier = 0.7; // High competition hurts
        } else if (competitionScore >= 60) {
            competitionMultiplier = 0.8;
        } else if (competitionScore >= 40) {
            competitionMultiplier = 0.9;
        } else if (competitionScore <= 20) {
            competitionMultiplier = 1.2; // Low competition helps
        } else if (competitionScore <= 40) {
            competitionMultiplier = 1.1;
        }
        
        const competitionAwareFlipScore = originalFlipScore * competitionMultiplier;
        
        return {
            ...opportunity,
            ...scoringResults,
            competitionScore,
            competitionAwareFlipScore
        };
    }

    /**
     * Sort flipping opportunities by various criteria
     */
    private static sortFlippingOpportunities(
        opportunities: EnhancedFlippingOpportunity[], 
        sortBy: 'flipScore' | 'competitionAwareFlipScore' | 'competition' | 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'profitPerHour' | 'instabuyVolume' | 'instasellVolume' | 'instaboughtPerHour' | 'instasoldPerHour' | 'riskLevel',
        budget: number | null
    ): EnhancedFlippingOpportunity[] {
        return opportunities.sort((a, b) => {
            switch (sortBy) {
                case 'flipScore':
                    return b.flipScore - a.flipScore;
                case 'competitionAwareFlipScore':
                    return b.competitionAwareFlipScore - a.competitionAwareFlipScore;
                case 'competition':
                    // Sort by competition score: HIGHEST first (most competitive items shown first)
                    return b.competitionScore - a.competitionScore;
                case 'totalProfit':
                    if (budget) {
                        const aTotalProfit = Math.floor(budget / a.buyPrice) * a.profitMargin;
                        const bTotalProfit = Math.floor(budget / b.buyPrice) * b.profitMargin;
                        return bTotalProfit - aTotalProfit;
                    }
                    return b.profitMargin - a.profitMargin;
                case 'profitMargin':
                    return b.profitPercentage - a.profitPercentage;
                case 'profitPerItem':
                    return b.profitMargin - a.profitMargin;
                case 'profitPerHour':
                    // Sort by estimated profit per hour (highest first)
                    return b.estimatedProfitPerHour - a.estimatedProfitPerHour;
                case 'instabuyVolume':
                    return b.weeklyBuyMovement - a.weeklyBuyMovement;
                case 'instasellVolume':
                    return b.weeklySellMovement - a.weeklySellMovement;
                case 'instaboughtPerHour':
                    // Sort by most instabought per hour (weeklyBuyMovement / 168 hours)
                    const aInstaboughtPerHour = a.weeklyBuyMovement / 168;
                    const bInstaboughtPerHour = b.weeklyBuyMovement / 168;
                    return bInstaboughtPerHour - aInstaboughtPerHour;
                case 'instasoldPerHour':
                    // Sort by most instasold per hour (weeklySellMovement / 168 hours)
                    const aInstasoldPerHour = a.weeklySellMovement / 168;
                    const bInstasoldPerHour = b.weeklySellMovement / 168;
                    return bInstasoldPerHour - aInstasoldPerHour;
                case 'riskLevel':
                    // Sort by risk level: LOW first, then MEDIUM, then HIGH
                    const riskOrder = { 'LOW': 0, 'MEDIUM': 1, 'HIGH': 2 };
                    const aRisk = riskOrder[a.riskLevel];
                    const bRisk = riskOrder[b.riskLevel];
                    if (aRisk !== bRisk) {
                        return aRisk - bRisk;
                    }
                    // If same risk level, sort by competition-aware flip score
                    return b.competitionAwareFlipScore - a.competitionAwareFlipScore;
                default:
                    return b.competitionAwareFlipScore - a.competitionAwareFlipScore;
            }
        });
    }
}
