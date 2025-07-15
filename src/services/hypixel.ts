import { BazaarResponse, BazaarProduct } from "../types";
import { HYPIXEL_API, ERROR_MESSAGES, MARKET_ANALYSIS } from "../constants";
import { AutocompleteCacheService } from './autocomplete-cache.js';

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
            
            const data = await response.json() as BazaarResponse;
            
            if (!data.success) {
                console.error('❌ API returned unsuccessful response');
                throw new Error("Bazaar API returned unsuccessful response");
            }
            
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
     * Gets weighted average prices for multiple items (top 2% by volume)
     * buyPrice = average price you can sell at instantly
     * sellPrice = average price you pay to buy instantly
     */
    static async getMultipleItemPrices(itemIds: string[]): Promise<Record<string, { buyPrice: number; sellPrice: number }>> {
        const bazaarData = await this.getBazaarPrices();
        const result: Record<string, { buyPrice: number; sellPrice: number }> = {};
        
        for (const itemId of itemIds) {
            const product = bazaarData.products[itemId];
            if (product) {
                result[itemId] = {
                    buyPrice: product.quick_status.buyPrice,
                    sellPrice: product.quick_status.sellPrice
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
        
        // Get best orders
        const bestBuyOrder = product.buy_summary[0] ? {
            price: product.buy_summary[0].pricePerUnit,
            amount: product.buy_summary[0].amount
        } : undefined;
        
        const bestSellOrder = product.sell_summary[0] ? {
            price: product.sell_summary[0].pricePerUnit,
            amount: product.sell_summary[0].amount
        } : undefined;
        
        // Calculate average prices from top orders
        const averageBuyPrice = product.buy_summary.length > 0 
            ? product.buy_summary.slice(0, MARKET_ANALYSIS.AVERAGE_PRICE_ORDERS).reduce((sum, order) => sum + order.pricePerUnit, 0) / Math.min(MARKET_ANALYSIS.AVERAGE_PRICE_ORDERS, product.buy_summary.length)
            : undefined;
            
        const averageSellPrice = product.sell_summary.length > 0
            ? product.sell_summary.slice(0, MARKET_ANALYSIS.AVERAGE_PRICE_ORDERS).reduce((sum, order) => sum + order.pricePerUnit, 0) / Math.min(MARKET_ANALYSIS.AVERAGE_PRICE_ORDERS, product.sell_summary.length)
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
}
