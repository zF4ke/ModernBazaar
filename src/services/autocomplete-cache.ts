import { promises as fs } from 'fs';
import { join } from 'path';

const CACHE_FILE_PATH = join(process.cwd(), 'autocomplete-cache.json');

interface AutocompleteCache {
    items: string[];
    lastUpdated: number;
    version: string;
}

export class AutocompleteCacheService {
    private static cache: AutocompleteCache | null = null;
    
    /**
     * Updates the autocomplete cache with fresh item names from API
     * THIS CACHE IS ONLY FOR AUTOCOMPLETE SUGGESTIONS - NEVER USE FOR BUSINESS LOGIC
     */
    static async updateCache(itemNames: string[]): Promise<void> {
        try {
            console.log(`💾 Updating autocomplete cache with ${itemNames.length} items...`);
            
            const newCache: AutocompleteCache = {
                items: itemNames.sort(),
                lastUpdated: Date.now(),
                version: '1.0.0'
            };
            
            // Write to file
            await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(newCache, null, 2));
            
            // Update in-memory cache
            this.cache = newCache;
            
            console.log(`✅ Autocomplete cache updated successfully\n`);
        } catch (error) {
            console.error('❌ Failed to update autocomplete cache:', error);
            // Don't throw - autocomplete failure shouldn't break the app
        }
    }
    
    /**
     * Loads the autocomplete cache from file or memory
     * THIS CACHE IS ONLY FOR AUTOCOMPLETE SUGGESTIONS - NEVER USE FOR BUSINESS LOGIC
     */
    static async loadCache(): Promise<string[]> {
        try {
            // Return cached items if already loaded
            if (this.cache) {
                return this.cache.items;
            }
            
            // Try to load from file
            const fileContent = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
            const cacheData: AutocompleteCache = JSON.parse(fileContent);
            
            // Validate cache structure
            if (cacheData.items && Array.isArray(cacheData.items)) {
                this.cache = cacheData;
                console.log(`📂 Loaded ${cacheData.items.length} items from autocomplete cache`);
                return cacheData.items;
            }
        } catch (error) {
            console.log('ℹ️  No autocomplete cache found or invalid, will use fallback items\n');
        }
        
        // Return empty array if no cache available
        return [];
    }
    
    /**
     * Searches cached items for autocomplete
     * Handles space-to-underscore conversion automatically
     * THIS CACHE IS ONLY FOR AUTOCOMPLETE SUGGESTIONS - NEVER USE FOR BUSINESS LOGIC
     */
    static async searchCachedItems(searchTerm: string): Promise<string[]> {
        const items = await this.loadCache();
        
        if (items.length === 0) {
            return [];
        }
        
        // Convert spaces to underscores and normalize the search term
        const normalizedSearch = searchTerm
            .replace(/\s+/g, '_')  // Convert spaces to underscores
            .toLowerCase()
            .replace(/[^a-z0-9_:]/g, '');
        
        if (!normalizedSearch) {
            // Return first 25 items if no search term
            return items.slice(0, 25);
        }
        
        const matches = items.filter(item => 
            item.toLowerCase().includes(normalizedSearch)
        );
        
        // Sort by relevance
        matches.sort((a, b) => {
            const aLower = a.toLowerCase();
            const bLower = b.toLowerCase();
            
            // Exact match first
            if (aLower === normalizedSearch) return -1;
            if (bLower === normalizedSearch) return 1;
            
            // Starts with second
            if (aLower.startsWith(normalizedSearch) && !bLower.startsWith(normalizedSearch)) return -1;
            if (bLower.startsWith(normalizedSearch) && !aLower.startsWith(normalizedSearch)) return 1;
            
            // Then alphabetical
            return a.localeCompare(b);
        });
        
        return matches.slice(0, 25);
    }
    
    /**
     * Gets cache stats for debugging
     */
    static async getCacheStats(): Promise<{ itemCount: number; lastUpdated: Date | null; cacheAge: number }> {
        const cache = await this.loadCache();
        
        if (!this.cache) {
            return { itemCount: 0, lastUpdated: null, cacheAge: 0 };
        }
        
        const lastUpdated = new Date(this.cache.lastUpdated);
        const cacheAge = Date.now() - this.cache.lastUpdated;
        
        return {
            itemCount: cache.length,
            lastUpdated,
            cacheAge
        };
    }
}
