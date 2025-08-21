package com.modernbazaar.core.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * Configures cache manager with different TTL values for each cache.
//     * @param listTtlSeconds TTL for liveViewList cache
     * @param itemTtlSeconds TTL for liveViewItem cache
//     * @param historyTtlSeconds TTL for liveViewHistory cache
     */
    @Bean
    public CacheManager cacheManager(
//            @Value("${skyblock.bazaar.cache.liveViewList.ttl-seconds:30}") long listTtlSeconds,
            @Value("${skyblock.bazaar.poll.interval-seconds:60}") long itemTtlSeconds
//            @Value("${skyblock.bazaar.cache.liveViewHistory.ttl-seconds:300}") long historyTtlSeconds
    ) {
        long listTtlSeconds = 5 * 60; // Default TTL for liveViewList cache
        long historyTtlSeconds = 5 * 60; // Default TTL for liveViewHistory cache

        // Create individual caches with different TTL values
        CaffeineCache liveViewListCache = new CaffeineCache("liveViewList",
                Caffeine.newBuilder()
                        .expireAfterWrite(listTtlSeconds, TimeUnit.SECONDS)
                        .maximumSize(10_000)
                        .build());

        CaffeineCache liveViewItemCache = new CaffeineCache("liveViewItem",
                Caffeine.newBuilder()
                        .expireAfterWrite(itemTtlSeconds, TimeUnit.SECONDS)
                        .maximumSize(10_000)
                        .build());

        CaffeineCache liveViewHistoryCache = new CaffeineCache("liveViewHistory",
                Caffeine.newBuilder()
                        .expireAfterWrite(historyTtlSeconds, TimeUnit.SECONDS)
                        .maximumSize(10_000)
                        .build());

        CaffeineCache liveViewHourAverageCache = new CaffeineCache("liveViewHourAverage",
                Caffeine.newBuilder()
                        .expireAfterWrite(historyTtlSeconds, TimeUnit.SECONDS) // Same TTL as history
                        .maximumSize(10_000)
                        .build());

        CaffeineCache financeAveragesCache = new CaffeineCache("financeAverages",
                Caffeine.newBuilder()
                        .expireAfterWrite(1, TimeUnit.HOURS) // 24 hours for financial averages
                        .maximumSize(10_000)
                        .build());

        CaffeineCache flipOpportunitiesCache = new CaffeineCache("flipOpportunities",
                Caffeine.newBuilder()
                        .expireAfterWrite(2, TimeUnit.MINUTES) // 5 minutes for flip opportunities
                        .maximumSize(10_000)
                        .build());

        CaffeineCache flipOpportunitiesAdvancedCache = new CaffeineCache("flipOpportunitiesAdvanced",
                Caffeine.newBuilder()
                        .expireAfterWrite(2, TimeUnit.MINUTES) // 5 minutes for flip opportunities
                        .maximumSize(10_000)
                        .build());

        // Use SimpleCacheManager to manage multiple caches
        SimpleCacheManager cacheManager = new SimpleCacheManager();
        cacheManager.setCaches(Arrays.asList(
                liveViewListCache,
                liveViewItemCache,
                liveViewHistoryCache,
                liveViewHourAverageCache,
                financeAveragesCache,
                flipOpportunitiesCache,
                flipOpportunitiesAdvancedCache
        ));

        return cacheManager;
    }
}
