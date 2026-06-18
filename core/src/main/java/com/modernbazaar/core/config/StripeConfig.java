package com.modernbazaar.core.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Sets the global Stripe API key once at startup so both the webhook controller
 * (static {@code Subscription.retrieve}) and {@link com.modernbazaar.core.service.StripeBillingService}
 * can talk to Stripe. No-op when {@code STRIPE_SECRET_KEY} is unset (billing not yet
 * configured) — the app still boots; Stripe calls simply won't be made.
 */
@Configuration
@Slf4j
public class StripeConfig {

    @Value("${stripe.secret-key:}")
    private String secretKey;

    @PostConstruct
    void init() {
        if (secretKey == null || secretKey.isBlank()) {
            log.info("Stripe secret key not set — Stripe billing is inactive (set STRIPE_SECRET_KEY to enable).");
            return;
        }
        Stripe.apiKey = secretKey;
        // Don't log the key; just confirm which mode we're in (test keys start with sk_test_).
        log.info("Stripe initialized in {} mode.", secretKey.startsWith("sk_test_") ? "TEST" : "LIVE");
    }
}
