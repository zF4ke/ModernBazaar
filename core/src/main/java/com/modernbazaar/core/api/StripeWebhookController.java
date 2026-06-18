package com.modernbazaar.core.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.modernbazaar.core.service.StripeBillingService;
import com.modernbazaar.core.service.SubscriptionService;
import com.modernbazaar.core.service.ReferralService;
import com.stripe.model.Event;
import com.stripe.model.Subscription;
import com.stripe.net.Webhook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Stripe Managed Payments (Merchant of Record) webhook. Reuses
 * {@link SubscriptionService#applyProviderWebhook}: the Stripe price id is stored in
 * {@code plan.stripe_price_id}, and the account is carried via
 * the subscription's {@code metadata.user_id} (set at Checkout) — with the Checkout
 * Session's {@code client_reference_id} as a fallback on the first event.
 *
 * Route is public (signature-verified) in SecurityConfig. Requires env
 * STRIPE_WEBHOOK_SECRET and BILLING_ENABLED=true.
 *
 * Fields are read from the raw JSON (webhook payload, or the raw API response body of
 * a retrieved subscription) rather than typed getters, so a Stripe API-version change
 * that relocates a field (e.g. {@code current_period_end} moving to the item level)
 * does not silently break entitlement.
 */
@RestController
@RequestMapping("/api/v1/billing")
@RequiredArgsConstructor
@Slf4j
public class StripeWebhookController {

    private final SubscriptionService subscriptionService;
    private final StripeBillingService stripeBillingService;
    private final ReferralService referralService;
    private final ObjectMapper objectMapper;

    @Value("${stripe.webhook-secret:}")
    private String webhookSecret;

    @Value("${billing.enabled:false}")
    private boolean billingEnabled;

    @PostMapping(path = "/webhook/stripe", consumes = "application/json")
    public ResponseEntity<Void> webhook(@RequestBody String payload,
                                        @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
        if (!billingEnabled) {
            log.debug("Billing disabled - ignoring Stripe webhook");
            return ResponseEntity.ok().build();
        }
        // Fail closed: a subscription mutation must never be processed unsigned.
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.error("BILLING_ENABLED is true but STRIPE_WEBHOOK_SECRET is not set — refusing to process webhook.");
            return ResponseEntity.status(500).build();
        }
        Event event;
        try {
            event = Webhook.constructEvent(payload, signature, webhookSecret);
        } catch (Exception e) {
            log.warn("Invalid Stripe webhook signature: {}", e.getMessage());
            return ResponseEntity.status(400).build();
        }

        try {
            JsonNode dataObject = objectMapper.readTree(payload).path("data").path("object");
            switch (event.getType()) {
                case "checkout.session.completed" -> handleCheckoutCompleted(dataObject);
                case "customer.subscription.updated", "customer.subscription.deleted" ->
                        applyFromSubscriptionJson(dataObject, null);
                case "invoice.paid" -> handleInvoicePaid(dataObject);
                default -> log.debug("Ignoring Stripe event type {}", event.getType());
            }
        } catch (Exception e) {
            // A processing error returns 200 only if already applied; otherwise 400 so Stripe retries.
            log.error("Error processing Stripe webhook (type={})", event.getType(), e);
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok().build();
    }

    /** First payment: attribute the account from the session and apply the new subscription, then record referral. */
    private void handleCheckoutCompleted(JsonNode session) throws Exception {
        String userId = textOrNull(session.path("client_reference_id"));
        String ref = textOrNull(session.path("metadata").path("ref"));
        String subscriptionId = textOrNull(session.path("subscription"));
        if (subscriptionId != null) {
            JsonNode subObj = retrieveSubscriptionJson(subscriptionId);
            if (subObj != null) applyFromSubscriptionJson(subObj, userId);
        }
        // Idempotent per referred user (see ReferralService), so a replayed signed event can't inflate counts.
        // Best-effort: a referral failure must NOT fail the already-applied subscription.
        try {
            referralService.recordConversion(ref, userId);
        } catch (Exception refErr) {
            log.warn("Referral conversion failed for user {} (continuing): {}", userId, refErr.getMessage());
        }
    }

    /** Renewal: push out the period end by re-applying the (now-updated) subscription. */
    private void handleInvoicePaid(JsonNode invoice) throws Exception {
        String subscriptionId = textOrNull(invoice.path("subscription"));
        if (subscriptionId == null) {
            // Newer API shapes nest the subscription id; try the common alternatives.
            subscriptionId = textOrNull(invoice.path("parent").path("subscription_details").path("subscription"));
        }
        if (subscriptionId == null) {
            log.debug("invoice.paid without a resolvable subscription id — ignoring (customer.subscription.updated will cover it).");
            return;
        }
        JsonNode subObj = retrieveSubscriptionJson(subscriptionId);
        if (subObj != null) applyFromSubscriptionJson(subObj, null);
    }

    /** Map a Stripe subscription JSON object onto our subscription model via SubscriptionService. */
    private void applyFromSubscriptionJson(JsonNode sub, String userIdFallback) {
        String userId = textOrNull(sub.path("metadata").path("user_id"));
        if (userId == null) userId = userIdFallback;
        if (userId == null) {
            log.warn("Stripe subscription event missing metadata.user_id and no fallback — ignoring (sub={})",
                    textOrNull(sub.path("id")));
            return;
        }
        String subscriptionId = textOrNull(sub.path("id"));
        String customerId = textOrNull(sub.path("customer"));
        JsonNode firstItem = sub.path("items").path("data").path(0);
        String priceId = textOrNull(firstItem.path("price").path("id"));
        boolean cancelAtPeriodEnd = sub.path("cancel_at_period_end").asBoolean(false);
        String status = mapStatus(textOrNull(sub.path("status")), cancelAtPeriodEnd);

        // current_period_end is at subscription level (older API) or item level (newer API).
        Long periodEnd = longOrNull(sub.path("current_period_end"));
        if (periodEnd == null) periodEnd = longOrNull(firstItem.path("current_period_end"));

        subscriptionService.applyProviderWebhook(priceId, customerId, subscriptionId, periodEnd, status, userId);
        log.info("Stripe subscription applied: user={} price={} status={} sub={}", userId, priceId, status, subscriptionId);
    }

    /** Retrieve a subscription and parse its raw API response body (all fields, SDK-version-proof). */
    private JsonNode retrieveSubscriptionJson(String subscriptionId) {
        try {
            Subscription sub = stripeBillingService.retrieveSubscription(subscriptionId);
            String raw = (sub.getLastResponse() != null) ? sub.getLastResponse().body() : sub.toJson();
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            log.error("Failed to retrieve Stripe subscription {}: {}", subscriptionId, e.getMessage());
            return null;
        }
    }

    /** Map Stripe status (+ scheduled cancellation) to our subscription status. */
    private static String mapStatus(String stripeStatus, boolean cancelAtPeriodEnd) {
        if (cancelAtPeriodEnd) return "canceled"; // access kept until current_period_end by entitledScopes
        if (stripeStatus == null) return "active";
        return switch (stripeStatus) {
            case "active", "trialing" -> "active";
            case "past_due" -> "past_due";
            case "canceled", "unpaid", "incomplete_expired" -> "canceled";
            case "incomplete" -> "incomplete";
            default -> stripeStatus;
        };
    }

    private static String textOrNull(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) return null;
        String s = node.asText(null);
        return (s == null || s.isBlank()) ? null : s;
    }

    private static Long longOrNull(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull() || !node.canConvertToLong()) return null;
        long v = node.asLong();
        return v == 0 ? null : v;
    }
}
