package com.modernbazaar.core.config;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

@Configuration
@EnableAsync
public class AsyncConfig {
    @Bean
    public Executor bazaarExecutor() {
        return Executors.newFixedThreadPool(
                Math.max(4, Runtime.getRuntime().availableProcessors()*2),
                new ThreadFactoryBuilder()
                        .setNameFormat("baz-comp-%d")
                        .setDaemon(true)
                        .build());
    }
}