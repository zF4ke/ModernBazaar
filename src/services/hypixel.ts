import { BazaarResponse, BazaarProduct } from "../types";
import { HYPIXEL_API, ERROR_MESSAGES, MARKET_ANALYSIS } from "../constants";
import { AutocompleteCacheService } from './autocomplete-cache.js';
import { PricingStrategy } from './crafting.js';

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
        sellPrice: number;
        sellVolume: number;
        sellMovingWeek: number;
        sellOrders: number;
        buyPrice: number;
        buyVolume: number;
        buyMovingWeek: number;
        buyOrders: number;
    };
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
                console.log('🚀 No autocomplete cache found, making initial API request...\n');
                await this.getBazaarPrices();
            } else {
                console.log(`📄 Autocomplete cache found with ${cacheStats.itemCount} items (age: ${Math.round(cacheStats.cacheAge / 1000 / 60)} minutes)\n`);
                
            }
            
            this.isInitialized = true;
        } catch (error) {
            console.error('⚠️ Failed to initialize Hypixel service:', error);
            this.isInitialized = true; // Continue anyway
        }
    }

    /**
     * Fetches current bazaar prices for all items
     */
    static async getBazaarPrices(): Promise<BazaarResponse> {
        try {
            console.log('\n🔄 Fetching Hypixel Bazaar data from API...');
            const startTime = Date.now();
            
            const response = await fetch(HYPIXEL_API.BAZAAR_URL);
            
            const fetchTime = Date.now() - startTime;
            console.log(`📡 API Response received in ${fetchTime}ms - Status: ${response.status}`);
            
            if (!response.ok) {
                console.error(`❌ API Error: HTTP ${response.status} - ${response.statusText}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const rawData = await response.json() as RawBazaarResponse;
            
            if (!rawData.success) {
                console.error('❌ API returned unsuccessful response');
                throw new Error("Bazaar API returned unsuccessful response");
            }
            
            // Transform the raw API response to our cleaner interface
            const data = this.transformBazaarData(rawData);
            
            const itemCount = Object.keys(data.products).length;
            const dataAge = Date.now() - data.lastUpdated;
            console.log(`✅ Successfully fetched ${itemCount} items from Hypixel API`);
            console.log(`📊 Data age: ${Math.round(dataAge / 1000)}s old`);
            
            // Update autocomplete cache
            await AutocompleteCacheService.updateCache(Object.keys(data.products));
            
            return data;
        } catch (error) {
            console.error("❌ Error fetching bazaar prices:", error);
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
     * Fixes the backwards field naming: sell_summary -> buy_orders, buy_summary -> sell_orders
     */
    private static transformBazaarData(rawData: RawBazaarResponse): BazaarResponse {
        const transformedProducts: Record<string, BazaarProduct> = {};
        
        for (const [productId, rawProduct] of Object.entries(rawData.products)) {
            transformedProducts[productId] = {
                product_id: rawProduct.product_id,
                // Fix backwards field names: sell_summary contains buy orders, buy_summary contains sell orders
                buy_orders: rawProduct.sell_summary,   // sell_summary -> buy_orders
                sell_orders: rawProduct.buy_summary,   // buy_summary -> sell_orders
                quick_status: rawProduct.quick_status
            };
        }
        
        return {
            success: rawData.success,
            lastUpdated: rawData.lastUpdated,
            products: transformedProducts
        };
    }
}
