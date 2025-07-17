import { Logger } from '../utils/logger.js';
import { npcArbitrageCacheService } from './npc-arbitrage-cache.js';

export interface NPCItem {
    id: string;
    name: string;
    material: string;
    npc_sell_price: number;
    category?: string;
    tier?: string;
}

export interface ArbitrageOpportunity {
    itemId: string;
    itemName: string;
    bazaarBuyPrice: number;
    npcSellPrice: number;
    profitPerItem: number;
    profitMargin: number;
    maxAffordable: number;
    totalProfit: number;
    feasible: boolean;
    weeklySellMovement: number;
}

export class NPCArbitrageService {
    /**
     * Sort opportunities by the specified criteria
     */
    static sortOpportunities(opportunities: ArbitrageOpportunity[], sortBy: 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'weeklySellMovement' | 'maxAffordable' | 'maxInstasellRatio' | 'profitPerHour' | 'betaScore' | 'deltaScore'): ArbitrageOpportunity[] {
        return opportunities.sort((a, b) => {
            switch (sortBy) {
                case 'totalProfit':
                    return b.totalProfit - a.totalProfit; // Highest total profit first
                case 'profitMargin':
                    return b.profitMargin - a.profitMargin; // Highest profit margin first
                case 'profitPerItem':
                    return b.profitPerItem - a.profitPerItem; // Highest profit per item first
                case 'weeklySellMovement':
                    return b.weeklySellMovement - a.weeklySellMovement; // Highest weekly volume first
                case 'maxAffordable':
                    return b.maxAffordable - a.maxAffordable; // Highest max affordable first
                case 'maxInstasellRatio':
                    // Calculate ratio of maxAffordable to hourly instasells (weeklySellMovement / 168)
                    const ratioA = a.maxAffordable / (a.weeklySellMovement / 168);
                    const ratioB = b.maxAffordable / (b.weeklySellMovement / 168);
                    return ratioB - ratioA; // Highest ratio first
                case 'profitPerHour':
                    // Calculate profit per hour: hourly instasells * profit per item
                    const profitPerHourA = (a.weeklySellMovement / 168) * a.profitPerItem;
                    const profitPerHourB = (b.weeklySellMovement / 168) * b.profitPerItem;
                    return profitPerHourB - profitPerHourA; // Highest profit per hour first
                case 'betaScore':
                    // Balanced Score: Volume-focused efficiency
                    // (Total Profit Weight) × (Profit Per Item Weight) × (Instasell Coverage Ratio) × (Quantity Penalty)
                    const calculateBetaScore = (opp: ArbitrageOpportunity) => {
                        const instasellRatio = (opp.weeklySellMovement / 168) / opp.maxAffordable;
                        return Math.log10(opp.totalProfit + 1) *           // Logarithmic total profit (favors millions over thousands)
                               Math.log10(opp.profitPerItem + 1) *         // Logarithmic profit per item (favors expensive items)
                               Math.min(instasellRatio, 3) *               // Instasell coverage ratio (capped at 3x for diminishing returns)
                               (1 / Math.log10(opp.maxAffordable + 1));    // Quantity penalty (favors fewer items to buy)
                    };
                    const betaScoreA = calculateBetaScore(a);
                    const betaScoreB = calculateBetaScore(b);
                    return betaScoreB - betaScoreA; // Highest beta score first
                case 'deltaScore':
                    // δ-Score (Enhanced Mathematical): Advanced margin-focused scoring with elegant mathematical caps
                    // Builds upon Balanced Score foundation with sophisticated margin emphasis and liquidity weighting
                    const calculateDeltaScore = (opp: ArbitrageOpportunity) => {
                        const hourlyInstasells = opp.weeklySellMovement / 168;
                        const instasellRatio = hourlyInstasells / opp.maxAffordable;
                        
                        // Core mathematical components (no hard filters, pure mathematics)
                        const marginScore = Math.log10(opp.profitMargin + 1) * Math.sqrt(opp.profitMargin / 100); // Enhanced margin weighting
                        const profitScore = Math.pow(Math.log10(opp.profitPerItem + 1), 1.2);                    // Slightly favor higher profits
                        const liquidityScore = Math.tanh(instasellRatio * 2) * 2;                                // Smooth liquidity curve (0-2 range)
                        const efficiencyBonus = 1 / (1 + Math.exp(opp.maxAffordable / 10000 - 2));               // Sigmoid efficiency curve
                        const volumeStability = Math.min(Math.log10(hourlyInstasells + 1), 3);                   // Capped volume consideration
                        
                        return marginScore * profitScore * liquidityScore * efficiencyBonus * volumeStability;
                    };
                    const deltaScoreA = calculateDeltaScore(a);
                    const deltaScoreB = calculateDeltaScore(b);
                    return deltaScoreB - deltaScoreA; // Highest delta score first
                default:
                    return b.totalProfit - a.totalProfit; // Default to total profit
            }
        });
    }

    /**
     * Fetches fresh NPC item data from Hypixel API
     */
    static async fetchNPCItems(): Promise<Map<string, NPCItem>> {
        try {
            const { HypixelService } = await import('./hypixel.js');
            const data = await HypixelService.getNPCItemData();

            Logger.verbose(`✅ Successfully fetched ${data.items?.length || 0} items from Hypixel NPC API`);

            const npcItems = new Map<string, NPCItem>();

            // print number of items fetched
            Logger.verbose(`🔍 Processing ${data.items?.length || 0} items with NPC sell prices...`);

            // Process items with NPC sell prices
            let itemsWithNPCPrices = 0;
            for (const item of data.items || []) {
                // if item has "salmon" in the id, log it
                // if (item.id.includes('SALMON')) {
                //     Logger.verbose(`🔍 Found item with "SALMON" in ID: ${item.id}`)
                // };
                if (item.npc_sell_price && item.npc_sell_price > 0) {
                    npcItems.set(item.id, {
                        id: item.id,
                        name: item.name,
                        material: item.material,
                        npc_sell_price: item.npc_sell_price,
                        category: item.category,
                        tier: item.tier
                    });
                    itemsWithNPCPrices++;
                }
            }

            Logger.verbose(`✅ Processed ${itemsWithNPCPrices} items with NPC sell prices`);

            // export all items for debugging to a file
            // const fs = await import('fs');
            // const path = './npc-items-debug.json';
            // fs.writeFileSync(path, JSON.stringify(Array.from(npcItems.entries()), null, 2));
            // Logger.verbose(`✅ NPC items debug data written to ${path}`);
            // Logger.verbose(`✅ Total NPC items with prices: ${npcItems.size}`);

            return npcItems;

        } catch (error) {
            console.error('❌ Failed to fetch NPC item data:', error);
            throw new Error(`Failed to fetch NPC data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Finds profitable NPC arbitrage opportunities with pagination and caching
     */
    static async findArbitrageOpportunities(
        budget: number,
        page: number = 1,
        itemsPerPage: number = 7,
        strategy: 'instabuy' | 'buyorder' = 'buyorder',
        forceRefresh: boolean = false,
        sortBy: 'totalProfit' | 'profitMargin' | 'profitPerItem' | 'weeklySellMovement' | 'maxAffordable' | 'maxInstasellRatio' | 'profitPerHour' | 'betaScore' | 'deltaScore' = 'betaScore'
    ): Promise<{ opportunities: ArbitrageOpportunity[], totalCount: number, totalPages: number, currentPage: number, totalProfit: number }> {
        // Clear cache if this is a fresh command execution
        if (forceRefresh) {
            npcArbitrageCacheService.clearCacheForBudgetStrategy(budget, strategy);
            Logger.verbose(`🗑️ Cleared cache for fresh command execution`);
        }

        // Check cache first (only if not forcing refresh)
        const cached = npcArbitrageCacheService.getCachedResult(budget, strategy);
        if (cached && !forceRefresh) {
            Logger.verbose(`🚀 Using cached NPC arbitrage results for budget ${budget} and strategy ${strategy}`);
            
            // Sort cached data according to the requested sort
            const sortedOpportunities = this.sortOpportunities([...cached.opportunities], sortBy);
            
            // Calculate pagination from sorted cached data
            const totalCount = cached.totalCount;
            const totalPages = cached.totalPages;
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const opportunities = sortedOpportunities.slice(startIndex, endIndex);

            return {
                opportunities,
                totalCount,
                totalPages,
                currentPage: page,
                totalProfit: cached.totalProfit
            };
        }

        Logger.verbose(`🔄 Fetching fresh NPC arbitrage data for budget ${budget} and strategy ${strategy}`);

        // Always fetch fresh data if not cached
        const npcItems = await this.fetchNPCItems();
        const { HypixelService } = await import('./hypixel.js');
        const bazaarData = await HypixelService.getBazaarPrices();

        Logger.verbose(`\n🔍 ANALYZING ALL NPC ARBITRAGE OPPORTUNITIES`);
        Logger.verbose(`💰 Budget: ${budget.toLocaleString()} coins`);
        Logger.verbose(`📊 Checking ${npcItems.size} NPC items vs ${Object.keys(bazaarData.products).length} bazaar products...`);

        const allOpportunities: ArbitrageOpportunity[] = [];
        let itemsChecked = 0;
        let profitableItems = 0;

        for (const [itemId, npcItem] of npcItems) {
            itemsChecked++;
            
            // Check if item exists in bazaar with required order types
            const bazaarProduct = bazaarData.products[itemId];
            if (!bazaarProduct) {
                continue;
            }

            // Check if the required order type exists based on strategy
            if (strategy === 'instabuy' && (!bazaarProduct.sell_orders || bazaarProduct.sell_orders.length === 0)) {
                continue;
            }
            if (strategy === 'buyorder' && (!bazaarProduct.buy_orders || bazaarProduct.buy_orders.length === 0)) {
                continue;
            }

            try {
                // Use analyzeSpecificItem to avoid code duplication
                const opportunity = await this.analyzeSpecificItem(itemId, budget, strategy, npcItems, bazaarData);
                
                if (opportunity) {
                    profitableItems++;
                    allOpportunities.push(opportunity);

                    Logger.verbose(`💎 Found opportunity: ${opportunity.itemName} - Buy: ${opportunity.bazaarBuyPrice.toFixed(2)} → NPC: ${opportunity.npcSellPrice} = +${opportunity.profitPerItem.toFixed(2)} coins (${opportunity.profitMargin.toFixed(1)}%)`);
                }
            } catch (error) {
                Logger.verbose(`⚠️ Error analyzing ${itemId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                continue;
            }
        }

        Logger.verbose(`📊 Analysis complete: ${itemsChecked} items checked, ${profitableItems} profitable opportunities found`);

        // Sort by total profit (descending) - most profitable first (default sort for caching)
        const sortedOpportunities = this.sortOpportunities(allOpportunities, 'totalProfit');

        // Calculate total profit across all opportunities
        const totalProfit = sortedOpportunities.reduce((sum, opp) => sum + opp.totalProfit, 0);

        // Cache the complete results (always cache with default totalProfit sort)
        const totalCount = sortedOpportunities.length;
        const totalPages = Math.ceil(totalCount / itemsPerPage);
        
        npcArbitrageCacheService.setCachedResult(budget, strategy, {
            opportunities: sortedOpportunities,
            totalCount,
            totalPages,
            totalProfit
        });

        Logger.verbose(`💾 Cached ${totalCount} opportunities for future pagination`);

        // Apply the requested sorting for the return data
        const finalSortedOpportunities = this.sortOpportunities([...sortedOpportunities], sortBy);

        // Calculate pagination for current request from sorted data
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const opportunities = finalSortedOpportunities.slice(startIndex, endIndex);

        return {
            opportunities,
            totalCount,
            totalPages,
            currentPage: page,
            totalProfit
        };
    }

    /**
     * Gets detailed analysis for a specific item
     */
    static async analyzeSpecificItem(
        itemId: string, 
        budget: number, 
        strategy: 'instabuy' | 'buyorder' = 'buyorder',
        npcItems?: Map<string, NPCItem>,
        bazaarData?: any
    ): Promise<ArbitrageOpportunity | null> {
        // Use provided data or fetch fresh data
        const items = npcItems || await this.fetchNPCItems();
        const npcItem = items.get(itemId);
        
        // if (itemId.includes('SALMON_OPAL')) {
        //     Logger.info(`Found item with "SALMON_OPAL" in ID: ${itemId}`);
        // }

        if (!npcItem) {
            return null;
        }

        let bazaar = bazaarData;
        if (!bazaar) {
            const { HypixelService } = await import('./hypixel.js');
            bazaar = await HypixelService.getBazaarPrices();
        }
        
        const bazaarProduct = bazaar.products[itemId];

        if (!bazaarProduct || !bazaarProduct.sell_orders || bazaarProduct.sell_orders.length === 0) {

            // if (itemId.includes('SALMON_OPAL')) {
            //     Logger.info(`Discarding ${itemId} - not available on bazaar`);
            // }   

            throw new Error(`Item ${itemId} not available on bazaar`);
        }

        // Calculate buying cost based on strategy
        let buyPrice: number;
        let maxAffordable: number = 0;
        
        if (strategy === 'instabuy') {
            // Calculate how many items we can buy profitably from sell orders (in order they appear)
            let totalCost = 0;
            let itemsBought = 0;
            let remainingBudget = budget;
            
            // Consume sell orders in the order they appear (already sorted by price)
            for (const order of bazaarProduct.sell_orders) {
                const pricePerUnit = order.pricePerUnit;
                // Add 4% tax for instant buy orders
                const priceWithTax = pricePerUnit * 1.04;
                
                // Check if this price is still profitable after tax
                if (priceWithTax >= npcItem.npc_sell_price) {
                    break; // No longer profitable at this price
                }
                
                // Calculate how many we can afford from this order (including tax)
                const affordableFromOrder = Math.min(
                    Math.floor(remainingBudget / priceWithTax),
                    order.amount
                );
                
                if (affordableFromOrder <= 0) {
                    break; // Can't afford any more
                }
                
                // Add these items to our purchase (cost includes tax)
                const costFromOrder = affordableFromOrder * priceWithTax;
                totalCost += costFromOrder;
                itemsBought += affordableFromOrder;
                remainingBudget -= costFromOrder;
                
                if (remainingBudget <= 0) {
                    break; // No budget left
                }
            }
            
            if (itemsBought === 0) {
                // No profitable items can be bought
                return null;
            }
            
            buyPrice = totalCost / itemsBought; // Weighted average price
            maxAffordable = itemsBought;
        } else {
            // Buy order strategy - use highest buy order price (no tax for buy orders)
            if (!bazaarProduct.buy_orders || bazaarProduct.buy_orders.length === 0) {
                throw new Error(`Item ${itemId} has no buy orders available`);
            }
            
            buyPrice = bazaarProduct.buy_orders[0].pricePerUnit;
            
            // Check if profitable at buy order price (no tax for buy orders)
            if (buyPrice >= npcItem.npc_sell_price) {
                return null; // Not profitable
            }
            
            maxAffordable = Math.floor(budget / buyPrice);
        }

        // Calculate profit and validate
        const profitPerItem = npcItem.npc_sell_price - buyPrice;
        
        if (profitPerItem <= 0 || maxAffordable <= 0) {
            return null; // Not profitable or can't afford any
        }

        // if (itemId.includes('SALMON')) {
        //     Logger.info(`� Analyzing ${npcItem.name} (${itemId}): Buy Price: ${buyPrice.toFixed(2)}, NPC Sell Price: ${npcItem.npc_sell_price}, Max Affordable: ${maxAffordable}`);
        // }

        const profitMargin = (profitPerItem / buyPrice) * 100;
        const totalProfit = profitPerItem * maxAffordable;
        const feasible = maxAffordable > 0 && profitPerItem > 0;

        // Get weekly sell movement from bazaar data
        const weeklySellMovement = bazaarProduct.quick_status?.sellMovingWeek || 0;

        return {
            itemId,
            itemName: npcItem.name,
            bazaarBuyPrice: buyPrice,
            npcSellPrice: npcItem.npc_sell_price,
            profitPerItem,
            profitMargin,
            maxAffordable,
            totalProfit,
            feasible,
            weeklySellMovement
        };
    }

    /**
     * Gets cache statistics (no caching anymore, so always returns fresh info)
     */
    static getCacheStats(): { itemCount: number; lastUpdated: Date | null; cacheAge: number } {
        return {
            itemCount: 0, // We don't cache anymore
            lastUpdated: new Date(), // Always fresh
            cacheAge: 0 // Always fresh data
        };
    }
}
