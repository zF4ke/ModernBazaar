import { BazaarResponse, BazaarProduct } from "../types";
import { HYPIXEL_API, ERROR_MESSAGES, MARKET_ANALYSIS } from "../constants";
import { AutocompleteCacheService } from './autocomplete-cache.js';
import { PricingStrategy } from './crafting.js';
import { Logger } from '../utils/logger.js';

/**
 * CRITICAL HYPIXEL API FIELD NAMING ISSUE:
 * 
 * The Hypixel Bazaar API has backwards field naming ONLY in order book fields:
 * - sell_summary contains BUY ORDERS (what people want to buy for)
 * - buy_summary contains SELL ORDERS (what people want to sell for)
 * 
 * However, quick_status fields are intuitive:
 * - quick_status.sellPrice = weighted average sell price (what you pay to buy)
 * - quick_status.buyPrice = weighted average buy price (what you get when selling)
 * 
 * We transform the API response to use intuitive field names:
 * - buy_orders: actual buy orders (from sell_summary)
 * - sell_orders: actual sell orders (from buy_summary)
 * 
 * This transformation happens in transformBazaarData() method.
 */

// Raw API response interface (with backwards field names)
interface RawBazaarProduct {
    product_id: string;
    sell_summary: Array<{
        amount: number;
        pricePerUnit: number;
        orders: number;
    }>;
    buy_summary: Array<{
        amount: number;
        pricePerUnit: number;
        orders: number;
    }>;
    quick_status: {
        productId: string;
        // BACKWARDS NAMING ALSO APPLIES TO VOLUME FIELDS:
        sellPrice: number;
        sellVolume: number;    // BACKWARDS: Actually total items in BUY orders
        sellMovingWeek: number;
        sellOrders: number;
        buyPrice: number;
        buyVolume: number;     // BACKWARDS: Actually total items in SELL orders
        buyMovingWeek: number;
        buyOrders: number;
    };
}

// NPC API response interface
interface NPCApiResponse {
    success: boolean;
    lastUpdated: number;
    items: Array<{
        id: string;
        name: string;
        material: string;
        npc_sell_price?: number;
        category?: string;
        tier?: string;
    }>;
}

interface RawBazaarResponse {
    success: boolean;
    lastUpdated: number;
    products: Record<string, RawBazaarProduct>;
}

export class HypixelService {
    private static isInitialized = false;

    /**
     * Initializes the service and ensures autocomplete cache exists
     */
    static async initialize(): Promise<void> {
        if (this.isInitialized) return;
        
        try {
            // Check if cache exists
            const cacheStats = await AutocompleteCacheService.getCacheStats();
            
            if (cacheStats.itemCount === 0) {
                Logger.verbose('🚀 No autocomplete cache found, making initial API request...\n');
                await this.getBazaarPrices();
            } else {
                Logger.verbose(`📄 Autocomplete cache found with ${cacheStats.itemCount} items (age: ${Math.round(cacheStats.cacheAge / 1000 / 60)} minutes)\n`);
                
            }
            
            this.isInitialized = true;
        } catch (error) {
            Logger.error('⚠️ Failed to initialize Hypixel service:', error);
            this.isInitialized = true; // Continue anyway
        }
    }

    /**
     * Fetches current bazaar prices for all items
     */
    static async getBazaarPrices(): Promise<BazaarResponse> {
        try {
            Logger.verbose('\n🔄 Fetching Hypixel Bazaar data from API...');
            const startTime = Date.now();
            
            const response = await fetch(HYPIXEL_API.BAZAAR_URL);
            
            const fetchTime = Date.now() - startTime;
            Logger.verbose(`📡 API Response received in ${fetchTime}ms - Status: ${response.status}`);
            
            if (!response.ok) {
                Logger.error(`❌ API Error: HTTP ${response.status} - ${response.statusText}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const rawData = await response.json() as RawBazaarResponse;
            
            if (!rawData.success) {
                Logger.error('❌ API returned unsuccessful response');
                throw new Error("Bazaar API returned unsuccessful response");
            }
            
            // Transform the raw API response to our cleaner interface
            const data = this.transformBazaarData(rawData);
            
            const itemCount = Object.keys(data.products).length;
            const dataAge = Date.now() - data.lastUpdated;
            Logger.verbose(`✅ Successfully fetched ${itemCount} items from Hypixel API`);
            Logger.verbose(`📊 Data age: ${Math.round(dataAge / 1000)}s old`);
            
            // Update autocomplete cache
            await AutocompleteCacheService.updateCache(Object.keys(data.products));
            
            return data;
        } catch (error) {
            Logger.error("❌ Error fetching bazaar prices:", error);
            throw new Error(ERROR_MESSAGES.API_ERROR);
        }
    }
    
    /**
     * Gets the weighted average buy price for a specific item (top 2% by volume)
     * This is the average price you can sell at instantly
     */
    static async getItemBuyPrice(itemId: string): Promise<number> {
        const bazaarData = await this.getBazaarPrices();
        const product = bazaarData.products[itemId];
        
        if (!product) {
            throw new Error(`${ERROR_MESSAGES.ITEM_NOT_FOUND}: ${itemId}`);
        }
        
        return product.quick_status.buyPrice;
    }
    
    /**
     * Gets the weighted average sell price for a specific item (top 2% by volume)
     * This is the average price you pay to buy instantly
     */
    static async getItemSellPrice(itemId: string): Promise<number> {
        const bazaarData = await this.getBazaarPrices();
        const product = bazaarData.products[itemId];
        
        if (!product) {
            throw new Error(`${ERROR_MESSAGES.ITEM_NOT_FOUND}: ${itemId}`);
        }
        
        return product.quick_status.sellPrice;
    }
    
    /**
     * Gets order book prices for multiple items with pricing strategy support
     * Returns the correct prices based on the intended trading strategy
     */
    static async getMultipleItemPricesWithStrategy(
        itemIds: string[], 
        pricingStrategy: PricingStrategy
    ): Promise<Record<string, { ingredientPrice: number; resultPrice: number }>> {
        const bazaarData = await this.getBazaarPrices();
        const result: Record<string, { ingredientPrice: number; resultPrice: number }> = {};
        
        for (const itemId of itemIds) {
            const product = bazaarData.products[itemId];
            if (product) {
                let ingredientPrice = 0;
                let resultPrice = 0;
                
                // Price for buying ingredients - Now using intuitive field names!
                if (pricingStrategy === PricingStrategy.BUY_ORDER_SELL_ORDER || pricingStrategy === PricingStrategy.BUY_ORDER_INSTANT_SELL) {
                    // Place buy orders for ingredients: we compete with other buyers
                    ingredientPrice = product.sell_orders[0]?.pricePerUnit || 0; // Use sell orders (what we pay to buy)
                } else {
                    // Instant buy ingredients: we pay current buy order prices
                    ingredientPrice = product.buy_orders[0]?.pricePerUnit || 0; // Use buy orders (instant buy price)
                }
                
                // Price for selling results
                if (pricingStrategy === PricingStrategy.BUY_ORDER_SELL_ORDER || pricingStrategy === PricingStrategy.INSTANT_BUY_SELL_ORDER) {
                    // Place sell orders for results: we compete with other sellers
                    resultPrice = product.buy_orders[0]?.pricePerUnit || 0; // Use buy orders (what we get to sell)
                } else {
                    // Instant sell results: we get current sell order prices
                    resultPrice = product.sell_orders[0]?.pricePerUnit || 0; // Use sell orders (instant sell price)
                }
                
                result[itemId] = {
                    ingredientPrice,
                    resultPrice
                };
            }
        }
        
        return result;
    }

    /**
     * Gets order book prices for multiple items (actual order prices, not weighted averages)
     * IMPORTANT: Hypixel API fields are backwards! 
     * buyPrice = instant sell price (what you get when selling instantly) - from sell_summary (buy orders)
     * sellPrice = instant buy price (what you pay when buying instantly) - from buy_summary (sell orders)
     */
    static async getMultipleItemPrices(itemIds: string[]): Promise<Record<string, { buyPrice: number; sellPrice: number }>> {
        const bazaarData = await this.getBazaarPrices();
        const result: Record<string, { buyPrice: number; sellPrice: number }> = {};
        
        for (const itemId of itemIds) {
            const product = bazaarData.products[itemId];
            if (product) {
                result[itemId] = {
                    // Now using intuitive field names!
                    buyPrice: product.buy_orders[0]?.pricePerUnit || 0,  // Instant sell price (highest buy order)
                    sellPrice: product.sell_orders[0]?.pricePerUnit || 0 // Instant buy price (lowest sell order)
                };
            }
        }
        
        return result;
    }
    
    /**
     * Gets detailed market information including order book data
     */
    static async getDetailedItemInfo(itemId: string): Promise<{
        product: BazaarProduct;
        bestBuyOrder?: { price: number; amount: number };
        bestSellOrder?: { price: number; amount: number };
        averageBuyPrice?: number;
        averageSellPrice?: number;
        lastUpdated: number;
    } | null> {
        const bazaarData = await this.getBazaarPrices();
        const product = bazaarData.products[itemId];
        
        if (!product) {
            return null;
        }
        
        // Get best orders - Now using intuitive field names!
        const bestBuyOrder = product.buy_orders[0] ? {
            price: product.buy_orders[0].pricePerUnit,
            amount: product.buy_orders[0].amount
        } : undefined;
        
        const bestSellOrder = product.sell_orders[0] ? {
            price: product.sell_orders[0].pricePerUnit,
            amount: product.sell_orders[0].amount
        } : undefined;
        
        // Calculate average prices from top orders - Using intuitive field names!
        const averageBuyPrice = product.buy_orders.length > 0
            ? product.buy_orders.slice(0, MARKET_ANALYSIS.AVERAGE_PRICE_ORDERS).reduce((sum: number, order: any) => sum + order.pricePerUnit, 0) / Math.min(MARKET_ANALYSIS.AVERAGE_PRICE_ORDERS, product.buy_orders.length)
            : undefined;
            
        const averageSellPrice = product.sell_orders.length > 0
            ? product.sell_orders.slice(0, MARKET_ANALYSIS.AVERAGE_PRICE_ORDERS).reduce((sum: number, order: any) => sum + order.pricePerUnit, 0) / Math.min(MARKET_ANALYSIS.AVERAGE_PRICE_ORDERS, product.sell_orders.length)
            : undefined;
        
        return {
            product,
            bestBuyOrder,
            bestSellOrder,
            averageBuyPrice,
            averageSellPrice,
            lastUpdated: bazaarData.lastUpdated
        };
    }

    /**
     * Transforms raw Hypixel API response to our cleaner interface
     * Fixes the backwards field naming: 
     * - sell_summary -> buy_orders
     * - buy_summary -> sell_orders
     * - sellVolume -> totalItemsInBuyOrders  
     * - buyVolume -> totalItemsInSellOrders
     */
    private static transformBazaarData(rawData: RawBazaarResponse): BazaarResponse {
        const transformedProducts: Record<string, BazaarProduct> = {};
        
        for (const [productId, rawProduct] of Object.entries(rawData.products)) {
            transformedProducts[productId] = {
                product_id: rawProduct.product_id,
                // Fix backwards field names: sell_summary contains buy orders, buy_summary contains sell orders
                buy_orders: rawProduct.sell_summary,   // sell_summary -> buy_orders
                sell_orders: rawProduct.buy_summary,   // buy_summary -> sell_orders
                quick_status: {
                    productId: rawProduct.quick_status.productId,
                    sellPrice: rawProduct.quick_status.sellPrice,
                    // Fix backwards volume fields
                    totalItemsInSellOrders: rawProduct.quick_status.buyVolume, // buyVolume -> totalItemsInSellOrders
                    sellMovingWeek: rawProduct.quick_status.sellMovingWeek,
                    sellOrders: rawProduct.quick_status.sellOrders,
                    buyPrice: rawProduct.quick_status.buyPrice,
                    totalItemsInBuyOrders: rawProduct.quick_status.sellVolume, // sellVolume -> totalItemsInBuyOrders
                    buyMovingWeek: rawProduct.quick_status.buyMovingWeek,
                    buyOrders: rawProduct.quick_status.buyOrders
                }
            };
        }
        
        return {
            success: rawData.success,
            lastUpdated: rawData.lastUpdated,
            products: transformedProducts
        };
    }

    /**
     * Calculates the actual cost of buying a specific quantity using instant buy (consuming sell orders)
     * This accounts for price increases as cheaper orders are consumed first
     * IMPORTANT: Hypixel adds 4% surcharge to instant buys for market stability
     */
    static calculateInstantBuyCost(sellOrders: Array<{pricePerUnit: number, amount: number}>, quantityNeeded: number, itemId?: string): { totalCost: number; averagePrice: number; feasible: boolean; maxPossible: number } {
        const itemName = itemId ? `[${itemId}] ` : '';
        
        Logger.verbose(`\n🔍 INSTANT BUY COST ANALYSIS ${itemName}`);
        Logger.verbose(`📦 Quantity needed: ${quantityNeeded.toLocaleString()}`);
        Logger.verbose(`📋 Available sell orders: ${sellOrders?.length || 0}`);
        
        if (!sellOrders || sellOrders.length === 0 || quantityNeeded <= 0) {
            Logger.verbose(`❌ Invalid input - returning zero cost`);
            return { totalCost: 0, averagePrice: 0, feasible: false, maxPossible: 0 };
        }

        // Calculate total available quantity
        const totalAvailable = sellOrders.reduce((sum, order) => sum + order.amount, 0);
        const actualQuantity = Math.min(quantityNeeded, totalAvailable);
        const feasible = actualQuantity >= quantityNeeded;

        // Show order book preview
        Logger.verbose(`\n📊 Order Book Preview (first 5 orders):`);
        sellOrders.slice(0, 5).forEach((order, index) => {
            Logger.verbose(`   ${index + 1}. ${order.pricePerUnit.toFixed(1)} coins × ${order.amount.toLocaleString()} items`);
        });

        Logger.verbose(`\n📈 Market Analysis:`);
        Logger.verbose(`   Total available: ${totalAvailable.toLocaleString()} items`);
        Logger.verbose(`   Requested: ${quantityNeeded.toLocaleString()} items`);
        Logger.verbose(`   Will buy: ${actualQuantity.toLocaleString()} items`);
        if (!feasible) {
            Logger.verbose(`   ⚠️ Market insufficient! Can only buy ${actualQuantity.toLocaleString()} of ${quantityNeeded.toLocaleString()}`);
        }

        let totalCost = 0;
        let quantityRemaining = actualQuantity;
        let totalQuantityObtained = 0;
        let orderIndex = 0;

        Logger.verbose(`\n🔄 Starting order consumption process:`);

        for (const order of sellOrders) {
            if (quantityRemaining <= 0) break;
            orderIndex++;

            const quantityFromThisOrder = Math.min(order.amount, quantityRemaining);
            const costFromThisOrder = quantityFromThisOrder * order.pricePerUnit;
            
            totalCost += costFromThisOrder;
            totalQuantityObtained += quantityFromThisOrder;
            quantityRemaining -= quantityFromThisOrder;

            Logger.verbose(`   Order ${orderIndex}: ${order.pricePerUnit.toFixed(1)} × ${quantityFromThisOrder.toLocaleString()} = ${costFromThisOrder.toLocaleString()} coins`);
            Logger.verbose(`             Running total: ${totalCost.toLocaleString()} coins, ${quantityRemaining.toLocaleString()} items remaining`);
            
            if (quantityRemaining <= 0) {
                Logger.verbose(`   ✅ Full quantity obtained after ${orderIndex} orders`);
                break;
            }
        }

        // Apply Hypixel's 4% instant buy surcharge
        const surchargeRate = 0.04;
        const totalCostWithSurcharge = totalCost * (1 + surchargeRate);
        const averagePrice = totalQuantityObtained > 0 ? totalCostWithSurcharge / totalQuantityObtained : 0;

        Logger.verbose(`\n📈 FINAL RESULTS:`);
        Logger.verbose(`   💰 Base cost: ${totalCost.toLocaleString()} coins`);
        Logger.verbose(`   📈 Hypixel 4% surcharge: ${(totalCostWithSurcharge - totalCost).toLocaleString()} coins`);
        Logger.verbose(`   💰 Total cost (with surcharge): ${totalCostWithSurcharge.toLocaleString()} coins`);
        Logger.verbose(`   📦 Quantity obtained: ${totalQuantityObtained.toLocaleString()} / ${quantityNeeded.toLocaleString()}`);
        Logger.verbose(`   💵 Average price (with surcharge): ${averagePrice.toFixed(2)} coins per item`);
        Logger.verbose(`   ✔️ Market feasible: ${feasible ? 'YES' : 'NO'}`);
        Logger.verbose(`   📊 Max possible: ${totalAvailable.toLocaleString()} items`);
        
        return {
            totalCost: totalCostWithSurcharge,
            averagePrice,
            feasible,
            maxPossible: totalAvailable
        };
    }

    /**
     * Calculates the actual revenue from selling a specific quantity using instant sell (consuming buy orders)
     * This accounts for price decreases as higher-paying orders are consumed first
     * NOTE: Instant sells don't have surcharges like instant buys
     */
    static calculateInstantSellRevenue(buyOrders: Array<{pricePerUnit: number, amount: number}>, quantityToSell: number, itemId?: string): { totalRevenue: number; averagePrice: number; feasible: boolean; maxPossible: number } {
        const itemName = itemId ? `[${itemId}] ` : '';
        
        Logger.verbose(`\n🔍 INSTANT SELL REVENUE ANALYSIS ${itemName}`);
        Logger.verbose(`📦 Quantity to sell: ${quantityToSell.toLocaleString()}`);
        Logger.verbose(`📋 Available buy orders: ${buyOrders?.length || 0}`);
        
        if (!buyOrders || buyOrders.length === 0 || quantityToSell <= 0) {
            Logger.verbose(`❌ Invalid input - returning zero revenue`);
            return { totalRevenue: 0, averagePrice: 0, feasible: false, maxPossible: 0 };
        }

        // Calculate total available demand
        const totalDemand = buyOrders.reduce((sum, order) => sum + order.amount, 0);
        const actualQuantity = Math.min(quantityToSell, totalDemand);
        const feasible = actualQuantity >= quantityToSell;

        {
            // Show order book preview
            Logger.verbose(`\n📊 Order Book Preview (first 5 orders):`);
            buyOrders.slice(0, 5).forEach((order, index) => {
                Logger.verbose(`   ${index + 1}. ${order.pricePerUnit.toFixed(1)} coins × ${order.amount.toLocaleString()} items`);
            });

            Logger.verbose(`\n📈 Market Analysis:`);
            Logger.verbose(`   Total demand: ${totalDemand.toLocaleString()} items`);
            Logger.verbose(`   Want to sell: ${quantityToSell.toLocaleString()} items`);
            Logger.verbose(`   Will sell: ${actualQuantity.toLocaleString()} items`);
            if (!feasible) {
                Logger.verbose(`   ⚠️ Market insufficient! Can only sell ${actualQuantity.toLocaleString()} of ${quantityToSell.toLocaleString()}`);
            }
        }
        if (!feasible) {
            Logger.verbose(`   ⚠️ Market insufficient! Can only sell ${actualQuantity.toLocaleString()} of ${quantityToSell.toLocaleString()}`);
        }

        let totalRevenue = 0;
        let quantityRemaining = actualQuantity;
        let totalQuantitySold = 0;
        let orderIndex = 0;

        Logger.verbose(`\n🔄 Starting order consumption process:`);

        for (const order of buyOrders) {
            if (quantityRemaining <= 0) break;
            orderIndex++;

            const quantityToThisOrder = Math.min(order.amount, quantityRemaining);
            const revenueFromThisOrder = quantityToThisOrder * order.pricePerUnit;
            
            totalRevenue += revenueFromThisOrder;
            totalQuantitySold += quantityToThisOrder;
            quantityRemaining -= quantityToThisOrder;

            Logger.verbose(`   Order ${orderIndex}: ${order.pricePerUnit.toFixed(1)} × ${quantityToThisOrder.toLocaleString()} = ${revenueFromThisOrder.toLocaleString()} coins`);
            Logger.verbose(`             Running total: ${totalRevenue.toLocaleString()} coins, ${quantityRemaining.toLocaleString()} items remaining`);
            
            if (quantityRemaining <= 0) {
                Logger.verbose(`   ✅ Full quantity sold after ${orderIndex} orders`);
                break;
            }
        }

        const averagePrice = totalQuantitySold > 0 ? totalRevenue / totalQuantitySold : 0;

        Logger.verbose(`\n📈 FINAL RESULTS:`);
        Logger.verbose(`   💰 Total revenue: ${totalRevenue.toLocaleString()} coins`);
        Logger.verbose(`   📦 Quantity sold: ${totalQuantitySold.toLocaleString()} / ${quantityToSell.toLocaleString()}`);
        Logger.verbose(`   💵 Average price: ${averagePrice.toFixed(2)} coins per item`);
        Logger.verbose(`   ✔️ Market feasible: ${feasible ? 'YES' : 'NO'}`);
        Logger.verbose(`   📊 Max possible: ${totalDemand.toLocaleString()} items`);
        
        return {
            totalRevenue,
            averagePrice,
            feasible,
            maxPossible: totalDemand
        };
    }

    /**
     * Gets order book prices with depth awareness for strategies that use instant buy/sell
     * This calculates realistic costs when buying/selling larger quantities
     */
    static async getDepthAwarePricing(
        itemIds: string[], 
        pricingStrategy: PricingStrategy,
        quantities: Record<string, number> = {} // quantity needed for each item
    ): Promise<Record<string, { ingredientPrice: number; resultPrice: number; feasible: boolean; maxPossibleCrafts?: number }>> {
        const bazaarData = await this.getBazaarPrices();
        const result: Record<string, { ingredientPrice: number; resultPrice: number; feasible: boolean; maxPossibleCrafts?: number }> = {};
        
        for (const itemId of itemIds) {
            const product = bazaarData.products[itemId];
            if (!product) {
                result[itemId] = { ingredientPrice: 0, resultPrice: 0, feasible: false };
                continue;
            }

            let ingredientPrice = 0;
            let resultPrice = 0;
            let ingredientFeasible = true;
            let resultFeasible = true;
            let maxPossibleCrafts: number | undefined;
            const quantityNeeded = quantities[itemId] || 1;

            Logger.verbose(`\n🔍 Analyzing ${itemId} for ${pricingStrategy} strategy`);

            // Price for buying ingredients
            if (pricingStrategy === PricingStrategy.BUY_ORDER_SELL_ORDER || pricingStrategy === PricingStrategy.BUY_ORDER_INSTANT_SELL) {
                // Place buy orders: use lowest sell order price (simple)
                ingredientPrice = product.sell_orders[0]?.pricePerUnit || 0;
                Logger.verbose(`   📥 Ingredient: Using order price ${ingredientPrice.toFixed(2)} (no depth analysis needed)`);
            } else {
                // Instant buy: calculate depth-aware cost
                const buyCost = this.calculateInstantBuyCost(product.sell_orders, quantityNeeded, itemId);
                ingredientPrice = buyCost.averagePrice;
                ingredientFeasible = buyCost.feasible;
                
                // Calculate max possible crafts based on ingredient availability
                if (buyCost.maxPossible < quantityNeeded) {
                    maxPossibleCrafts = buyCost.maxPossible;
                    Logger.verbose(`   ⚠️ Limited by ingredient availability: max ${buyCost.maxPossible} items`);
                }
            }
            
            // Price for selling results  
            if (pricingStrategy === PricingStrategy.BUY_ORDER_SELL_ORDER || pricingStrategy === PricingStrategy.INSTANT_BUY_SELL_ORDER) {
                // Place sell orders: use highest buy order price (simple)
                resultPrice = product.buy_orders[0]?.pricePerUnit || 0;
                Logger.verbose(`   📤 Result: Using order price ${resultPrice.toFixed(2)} (no depth analysis needed)`);
            } else {
                // Instant sell: calculate depth-aware revenue
                const sellRevenue = this.calculateInstantSellRevenue(product.buy_orders, quantityNeeded, itemId);
                resultPrice = sellRevenue.averagePrice;
                resultFeasible = sellRevenue.feasible;
                
                // Calculate max possible crafts based on result market demand
                if (sellRevenue.maxPossible < quantityNeeded) {
                    const demandBasedMax = sellRevenue.maxPossible;
                    maxPossibleCrafts = maxPossibleCrafts ? Math.min(maxPossibleCrafts, demandBasedMax) : demandBasedMax;
                    Logger.verbose(`   ⚠️ Limited by result market demand: max ${sellRevenue.maxPossible} items`);
                }
            }
            
            result[itemId] = {
                ingredientPrice,
                resultPrice,
                feasible: ingredientFeasible && resultFeasible,
                maxPossibleCrafts
            };
        }
        
        return result;
    }

    /**
     * Fetches NPC item data from Hypixel SkyBlock API
     */
    static async getNPCItemData(): Promise<NPCApiResponse> {
        try {
            Logger.verbose('🔄 Fetching NPC item data from Hypixel API...');
            const startTime = Date.now();
            
            const response = await fetch(HYPIXEL_API.NPC_ITEMS_URL);

            const fetchTime = Date.now() - startTime;
            Logger.verbose(`📡 NPC API Response received in ${fetchTime}ms - Status: ${response.status}`);

            if (!response.ok) {
                Logger.error(`❌ NPC API Error: HTTP ${response.status} - ${response.statusText}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as NPCApiResponse;
            
            if (!data.success) {
                Logger.error('❌ NPC API returned unsuccessful response');
                throw new Error('API returned unsuccessful response');
            }

            Logger.verbose(`📦 Processing ${data.items?.length || 0} NPC items...`);
            return data;

        } catch (error) {
            Logger.error('❌ Failed to fetch NPC item data:', error);
            throw new Error(`Failed to fetch NPC data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
