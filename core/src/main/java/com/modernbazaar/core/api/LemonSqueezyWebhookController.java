package com.modernbazaar.core.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.modernbazaar.core.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.HexFormat;

/**
 * Lemon Squeezy (Merchant of Record) webhook. Mirrors the Stripe handler and
 * reuses {@link SubscriptionService#applyStripeWebhook}: the Lemon Squeezy
 * variant id is stored in {@code plan.stripe_price_id} (provider price id), and
 * {@code custom_data.user_id} (passed at checkout) carries the account.
 *
 * Setup: see docs/ADMIN_SUITE_PLAN.md. Requires env LEMONSQUEEZY_WEBHOOK_SECRET
 * and BILLING_ENABLED=true. Route is public (signature-verified) in SecurityConfig.
 */
@RestController
@RequestMapping("/api/v1/billing")
@RequiredArgsConstructor
@Slf4j
public class LemonSqueezyWebhookController {

    private final SubscriptionService subscriptionService;
    private final ObjectMapper objectMapper;

    @Value("${lemonsqueezy.webhook-secret:}")
    private String webhookSecret;

    @Value("${billing.enabled:false}")
    private boolean billingEnabled;

    @PostMapping(path = "/webhook/lemonsqueezy", consumes = "application/json")
    public ResponseEntity<Void> webhook(@RequestBody String payload,
                                        @RequestHeader(value = "X-Signature", required = false) String signature) {
        if (!billingEnabled) {
            log.debug("Billing disabled - ignoring Lemon Squeezy webhook");
            return ResponseEntity.ok().build();
        }
        if (webhookSecret != null && !webhookSecret.isBlank()) {
            if (signature == null || !validSignature(payload, signature)) {
                log.warn("Invalid Lemon Squeezy webhook signature");
                return ResponseEntity.status(400).build();
            }
        }
        try {
            JsonNode root = objectMapper.readTree(payload);
            String event = root.path("meta").path("event_name").asText("");
            JsonNode attrs = root.path("data").path("attributes");

            String userId = root.path("meta").path("custom_data").path("user_id").asText(null);
            if (userId == null || userId.isBlank()) {
                log.warn("Lemon Squeezy webhook missing custom_data.user_id - ignoring (event={})", event);
                return ResponseEntity.ok().build();
            }

            String variantId = attrs.path("variant_id").asText(null); // maps to plan.stripe_price_id
            String subscriptionId = root.path("data").path("id").asText(null);
            String customerId = attrs.path("customer_id").asText(null);
            String status = mapStatus(attrs.path("status").asText(null), event);
            Long periodEnd = parseEpoch(attrs.path("renews_at").asText(null));

            subscriptionService.applyStripeWebhook(variantId, customerId, subscriptionId, periodEnd, status, userId);
            log.info("Lemon Squeezy {} applied: user={} variant={} status={}", event, userId, variantId, status);
        } catch (Exception e) {
            log.error("Error processing Lemon Squeezy webhook", e);
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok().build();
    }

    private boolean validSignature(String payload, String signature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String computed = HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
            return MessageDigest.isEqual(computed.getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.warn("Failed to verify Lemon Squeezy signature", e);
            return false;
        }
    }

    /** Map Lemon Squeezy status (and cancellation events) to our subscription status. */
    private static String mapStatus(String lsStatus, String event) {
        if ("subscription_cancelled".equals(event)) return "canceled";
        if (lsStatus == null) return "active";
        return switch (lsStatus) {
            case "active", "on_trial" -> "active";
            case "past_due" -> "past_due";
            case "cancelled", "expired", "unpaid" -> "canceled";
            default -> lsStatus;
        };
    }

    private static Long parseEpoch(String iso) {
        if (iso == null || iso.isBlank()) return null;
        try {
            return OffsetDateTime.parse(iso).toEpochSecond();
        } catch (Exception e) {
            return null;
        }
    }
}
