package com.modernbazaar.core.api;

import com.modernbazaar.core.repository.PlanRepository;
import com.modernbazaar.core.service.StripeBillingService;
import com.modernbazaar.core.service.SubscriptionService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/**
 * Server-side creation of Stripe Checkout and Customer-Portal sessions for the
 * authenticated user. The Checkout Session replaces the old static hosted buy links —
 * it carries the account ({@code client_reference_id} / metadata) so the
 * webhook can attribute the subscription, and enables Stripe-native promotion codes.
 *
 * Both routes live under {@code /api/me/billing/**}, which requires authentication via
 * SecurityConfig's {@code anyRequest().authenticated()} fallback (any signed-in tier).
 */
@RestController
@RequestMapping(path = "/api/me/billing", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Slf4j
public class StripeBillingController {

    private final StripeBillingService stripeBillingService;
    private final SubscriptionService subscriptionService;
    private final PlanRepository planRepository;

    @Value("${billing.enabled:false}")
    private boolean billingEnabled;

    public record CheckoutRequest(String plan, String ref) {}
    public record UrlResponse(String url) {}

    /** Create a Checkout Session for a paid plan and return its hosted URL. */
    @PostMapping(path = "/checkout-session", consumes = MediaType.APPLICATION_JSON_VALUE)
    @RateLimiter(name = "subscriptionEndpoint")
    public ResponseEntity<?> createCheckoutSession(@AuthenticationPrincipal Jwt jwt,
                                                   @RequestBody CheckoutRequest body) {
        // Fail closed like the webhook: never take a payment while billing is half-configured
        // (secret key set but BILLING_ENABLED=false) — the webhook would drop the resulting event.
        if (!billingEnabled || !stripeBillingService.isConfigured()) {
            return ResponseEntity.status(503).body(error("Billing is not enabled"));
        }
        String planSlug = body == null ? null : body.plan();
        if (planSlug == null || planSlug.isBlank()) {
            return ResponseEntity.badRequest().body(error("Missing plan"));
        }
        var plan = planRepository.findBySlug(planSlug.trim().toLowerCase()).orElse(null);
        if (plan == null || plan.getStripePriceId() == null || plan.getStripePriceId().isBlank()) {
            return ResponseEntity.badRequest().body(error("Plan has no Stripe price configured: " + planSlug));
        }

        String userId = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        var existing = subscriptionService.findCurrentForUser(userId).orElse(null);
        String customerId = existing == null ? null : existing.getStripeCustomerId();
        if (email == null && existing != null) email = existing.getEmail();

        try {
            String url = stripeBillingService.createCheckoutSession(
                    plan.getStripePriceId(), userId, email, customerId, body.ref());
            return ResponseEntity.ok(new UrlResponse(url));
        } catch (Exception e) {
            log.error("Failed to create Stripe checkout session for user {}: {}", userId, e.getMessage());
            return ResponseEntity.status(502).body(error("Could not start checkout"));
        }
    }

    /** Create a Customer-Portal session (manage payment method / invoices / cancel) and return its URL. */
    @PostMapping(path = "/portal-session")
    @RateLimiter(name = "subscriptionEndpoint")
    public ResponseEntity<?> createPortalSession(@AuthenticationPrincipal Jwt jwt) {
        if (!billingEnabled || !stripeBillingService.isConfigured()) {
            return ResponseEntity.status(503).body(error("Billing is not enabled"));
        }
        String userId = jwt.getSubject();
        var existing = subscriptionService.findCurrentForUser(userId).orElse(null);
        String customerId = existing == null ? null : existing.getStripeCustomerId();
        if (customerId == null || customerId.isBlank()) {
            return ResponseEntity.badRequest().body(error("No billing account yet — subscribe first"));
        }
        try {
            String url = stripeBillingService.createPortalSession(customerId);
            if (url == null) return ResponseEntity.badRequest().body(error("No billing account yet"));
            return ResponseEntity.ok(new UrlResponse(url));
        } catch (Exception e) {
            log.error("Failed to create Stripe portal session for user {}: {}", userId, e.getMessage());
            return ResponseEntity.status(502).body(error("Could not open billing portal"));
        }
    }

    private static java.util.Map<String, String> error(String msg) {
        return java.util.Map.of("error", msg);
    }
}
