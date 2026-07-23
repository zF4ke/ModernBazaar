package com.modernbazaar.core.config;

import com.modernbazaar.core.domain.Plan;
import com.modernbazaar.core.repository.PlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * Seeds the Stripe recurring price id onto each paid plan at startup, so checkout and
 * the webhook can map price ↔ plan via {@code plan.stripe_price_id}. Idempotent and
 * conservative:
 *  - only writes when the plan's price id is unset OR still a legacy Lemon Squeezy
 *    variant id (all-digits) — it never overwrites a Stripe id ({@code price_…}) an
 *    admin set via the Plans page;
 *  - creates the flipper/elite plan row if missing (fresh DB), matching the admin defaults.
 * Price ids are not secrets (they're exposed at checkout); the values come from
 * {@code stripe.price.*} config and are env-overridable.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StripePlanSeeder implements ApplicationRunner {

    private static final String DEFAULT_FEATURES = "{\"limits\":{\"maxItemsPerPage\":50}}";
    private static final Set<String> OBSOLETE_TEST_PRICE_IDS = Set.of(
            "price_1TjULbCf0etY1rScAcWgdmPd",
            "price_1TjULcCf0etY1rSc1img5IrV"
    );

    private final PlanRepository planRepository;

    @Value("${stripe.price.flipper:}")
    private String flipperPriceId;

    @Value("${stripe.price.elite:}")
    private String elitePriceId;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seed("flipper", "Flipper", flipperPriceId);
        seed("elite", "Elite", elitePriceId);
    }

    private void seed(String slug, String name, String priceId) {
        if (priceId == null || priceId.isBlank()) return;
        var existing = planRepository.findBySlug(slug).orElse(null);
        if (existing == null) {
            planRepository.save(Plan.builder()
                    .slug(slug).name(name)
                    .stripePriceId(priceId)
                    .featuresJson(DEFAULT_FEATURES)
                    .active(true)
                    .build());
            log.info("Seeded missing plan '{}' with Stripe price id {}", slug, priceId);
            return;
        }
        String current = existing.getStripePriceId();
        boolean unsetOrLegacy = current == null || current.isBlank()
                || current.chars().allMatch(Character::isDigit) // legacy Lemon Squeezy numeric variant id
                || OBSOLETE_TEST_PRICE_IDS.contains(current);
        if (unsetOrLegacy && !priceId.equals(current)) {
            existing.setStripePriceId(priceId);
            planRepository.save(existing);
            log.info("Migrated plan '{}' stripe_price_id {} -> {}", slug, current, priceId);
        }
    }
}
