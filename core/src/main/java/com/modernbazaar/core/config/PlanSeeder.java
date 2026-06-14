package com.modernbazaar.core.config;

import com.modernbazaar.core.domain.Plan;
import com.modernbazaar.core.repository.PlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Ensures the three real plans (free / flipper / elite) exist on startup. Without
 * this, setting a user to flipper/elite 404'd (the plan row didn't exist). Only
 * creates missing plans — never overwrites, so admin-set variant ids survive.
 */
@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class PlanSeeder implements ApplicationRunner {

    private final PlanRepository plans;

    private record Seed(String slug, String name, String featuresJson) {}

    private static final List<Seed> SEEDS = List.of(
            new Seed("free", "Free", "{\"limits\":{\"maxItemsPerPage\":50}}"),
            new Seed("flipper", "Flipper", "{\"limits\":{\"maxItemsPerPage\":100}}"),
            new Seed("elite", "Elite", "{\"limits\":{\"maxItemsPerPage\":200}}")
    );

    @Override
    public void run(ApplicationArguments args) {
        for (Seed s : SEEDS) {
            if (plans.findBySlug(s.slug()).isEmpty()) {
                plans.save(Plan.builder()
                        .slug(s.slug()).name(s.name())
                        .stripePriceId(null).featuresJson(s.featuresJson()).active(true)
                        .build());
                log.info("Seeded plan '{}'", s.slug());
            }
        }
    }
}
