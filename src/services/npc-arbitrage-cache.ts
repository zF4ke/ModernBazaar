import { ArbitrageOpportunity } from './npc-arbitrage.js';

interface CachedArbitrageResult {
    opportunities: ArbitrageOpportunity[];
    totalCount: number;
    totalPages: number;
    totalProfit: number;
    budget: number;
    strategy: string;
    timestamp: number;
}

class NPCArbitrageCacheService {
    private cache = new Map<string, CachedArbitrageResult>();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    private getCacheKey(budget: number, strategy: string): string {
        return `${budget}_${strategy}`;
    }

    getCachedResult(budget: number, strategy: string): CachedArbitrageResult | null {
        const key = this.getCacheKey(budget, strategy);
        const cached = this.cache.get(key);

        if (!cached) {
            return null;
        }

        // Check if cache is expired
        if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
            this.cache.delete(key);
            return null;
        }

        return cached;
    }

    setCachedResult(budget: number, strategy: string, result: Omit<CachedArbitrageResult, 'timestamp' | 'budget' | 'strategy'>): void {
        const key = this.getCacheKey(budget, strategy);
        this.cache.set(key, {
            ...result,
            budget,
            strategy,
            timestamp: Date.now()
        });
    }

    clearCacheForBudgetStrategy(budget: number, strategy: string): void {
        const key = this.getCacheKey(budget, strategy);
        this.cache.delete(key);
    }

    clearCache(): void {
        this.cache.clear();
    }

    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

export const npcArbitrageCacheService = new NPCArbitrageCacheService();
