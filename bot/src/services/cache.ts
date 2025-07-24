import { promises as fs } from 'fs';
import { join } from 'path';

export interface BazaarCacheData {
    items: string[];
    lastUpdated: number;
    version: string;
}

export class CacheService {
    private static readonly CACHE_FILE = join(process.cwd(), 'bazaar-cache.json');
    private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    /**
     * Loads cached bazaar items
     */
    static async loadCache(): Promise<string[] | null> {
        try {
            const fileContent = await fs.readFile(this.CACHE_FILE, 'utf-8');
            const cacheData: BazaarCacheData = JSON.parse(fileContent);
            
            // Check if cache is still valid
            const now = Date.now();
            if (now - cacheData.lastUpdated < this.CACHE_DURATION) {
                console.log(`📦 Loaded ${cacheData.items.length} items from cache`);
                return cacheData.items;
            } else {
                console.log('⏰ Cache expired, will fetch fresh data');
                return null;
            }
        } catch (error) {
            console.log('📦 No valid cache found, will fetch fresh data');
            return null;
        }
    }
    
    /**
     * Saves bazaar items to cache
     */
    static async saveCache(items: string[]): Promise<void> {
        try {
            const cacheData: BazaarCacheData = {
                items,
                lastUpdated: Date.now(),
                version: '1.0.0'
            };
            
            await fs.writeFile(this.CACHE_FILE, JSON.stringify(cacheData, null, 2));
            console.log(`💾 Cached ${items.length} bazaar items`);
        } catch (error) {
            console.error('❌ Failed to save cache:', error);
        }
    }
    
    /**
     * Checks if cache exists and is valid
     */
    static async isCacheValid(): Promise<boolean> {
        try {
            const fileContent = await fs.readFile(this.CACHE_FILE, 'utf-8');
            const cacheData: BazaarCacheData = JSON.parse(fileContent);
            
            const now = Date.now();
            return now - cacheData.lastUpdated < this.CACHE_DURATION;
        } catch {
            return false;
        }
    }
    
    /**
     * Clears the cache file
     */
    static async clearCache(): Promise<void> {
        try {
            await fs.unlink(this.CACHE_FILE);
            console.log('🗑️ Cache cleared');
        } catch (error) {
            // File probably doesn't exist, which is fine
        }
    }
}
