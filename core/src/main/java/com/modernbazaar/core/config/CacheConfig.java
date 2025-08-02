package com.modernbazaar.core.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * Configures a Caffeine cache builder using a TTL pulled from application properties.
     * @param ttlSeconds the cache expiration time in seconds, read from 'skyblock.bazaar.poll.interval-seconds'
     */
    @Bean
    public Caffeine<Object, Object> caffeineConfig(
            @Value("${skyblock.bazaar.poll.interval-seconds:60}") long ttlSeconds
    ) {
        return Caffeine.newBuilder()
                .expireAfterWrite(ttlSeconds, TimeUnit.SECONDS)
                .maximumSize(10_000);
    }

    /**
     * Declares named caches for list, item, and history views using the shared builder.
     */
    @Bean
    public CacheManager cacheManager(Caffeine<Object, Object> caffeine) {
        CaffeineCacheManager mgr = new CaffeineCacheManager(
                "liveViewList",
                "liveViewItem",
                "liveViewHistory"
        );
        mgr.setCaffeine(caffeine);
        return mgr;
    }
}
