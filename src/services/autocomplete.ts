import { MARKET_ANALYSIS } from '../constants/index.js';
import { AutocompleteCacheService } from './autocomplete-cache.js';

export class BazaarAutocompleteService {
    /**
     * Searches for bazaar items matching the input for autocomplete
     * Automatically converts spaces to underscores for better user experience
     */
    static async searchBazaarItems(input: string): Promise<string[]> {
        // Convert spaces to underscores to match item naming convention
        const normalizedInput = input.replace(/\s+/g, '_');
        
        // First try to get items from cache
        let items = await AutocompleteCacheService.searchCachedItems(normalizedInput);
        
        // If no cached items found, use fallback items
        if (items.length === 0) {
            console.log('⚠️ No cached items found, using fallback items for autocomplete');
            const fallbackItems = this.getFallbackItems();
            
            if (!normalizedInput) {
                return fallbackItems.slice(0, MARKET_ANALYSIS.MAX_AUTOCOMPLETE_RESULTS);
            }
            
            const searchTerm = normalizedInput.toLowerCase().replace(/[^a-z0-9_:]/g, '');
            const matches = fallbackItems.filter(item => 
                item.toLowerCase().includes(searchTerm)
            );
            
            // Sort matches by relevance
            matches.sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();
                
                if (aLower === searchTerm) return -1;
                if (bLower === searchTerm) return 1;
                
                if (aLower.startsWith(searchTerm) && !bLower.startsWith(searchTerm)) return -1;
                if (bLower.startsWith(searchTerm) && !aLower.startsWith(searchTerm)) return 1;
                
                return a.localeCompare(b);
            });
            
            return matches.slice(0, MARKET_ANALYSIS.MAX_AUTOCOMPLETE_RESULTS);
        }
        
        return items;
    }
    
    /**
     * Formats item name for display in autocomplete
     */
    static formatItemNameForDisplay(itemId: string): string {
        return itemId
            .replace(/_/g, ' ')
            .replace(/:/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, char => char.toUpperCase())
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    /**
     * Gets fallback items when cache is not available
     */
    private static getFallbackItems(): string[] {
        return [
            'ENCHANTED_BREAD', 'ENCHANTED_CARROT', 'ENCHANTED_POTATO', 'ENCHANTED_WHEAT',
            'ENCHANTED_COAL', 'ENCHANTED_IRON', 'ENCHANTED_GOLD', 'ENCHANTED_DIAMOND',
            'ENCHANTED_OAK_LOG', 'ENCHANTED_SPRUCE_LOG', 'ENCHANTED_RAW_FISH',
            'WHEAT', 'CARROT_ITEM', 'POTATO_ITEM', 'COAL', 'IRON_INGOT', 'GOLD_INGOT',
            'SUPER_COMPACTOR_3000', 'BUDGET_HOPPER', 'ENCHANTED_HOPPER', 'CATALYST',
            'SEEDS', 'CARROT', 'POTATO', 'PUMPKIN', 'MELON', 'CACTUS', 'SUGAR_CANE',
            'LOG', 'RAW_FISH', 'INK_SACK:4', 'OBSIDIAN', 'COBBLESTONE'
        ];
    }
}
