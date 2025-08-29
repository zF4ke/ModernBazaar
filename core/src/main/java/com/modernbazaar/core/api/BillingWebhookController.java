package com.modernbazaar.core.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.modernbazaar.core.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import com.stripe.net.Webhook;
import com.stripe.exception.SignatureVerificationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/billing")
@RequiredArgsConstructor
@Slf4j
public class BillingWebhookController {

    private final SubscriptionService subscriptionService;
    private final ObjectMapper objectMapper;

    @Value("${stripe.webhook-secret:}")
    private String webhookSecret;

    @Value("${billing.enabled:false}")
    private boolean billingEnabled;

    @PostMapping(path = "/webhook/stripe", consumes = "application/json")
    public ResponseEntity<Void> stripeWebhook(@RequestBody String payload,
                                              @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
        if (!billingEnabled) {
            log.debug("Billing desativado - ignorando webhook Stripe");
            return ResponseEntity.ok().build();
        }
        // Se não houver secret configurada (dev local), processa sem validar
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.debug("Webhook Stripe sem verificação de assinatura (dev mode)");
            return processEvent(payload);
        }
        try {
            if (signature == null) {
                log.warn("Stripe-Signature ausente");
                return ResponseEntity.status(400).build();
            }
            Webhook.constructEvent(payload, signature, webhookSecret); // valida ou lança
            return processEvent(payload);
        } catch (SignatureVerificationException e) {
            log.warn("Assinatura Stripe inválida: {}", e.getMessage());
            return ResponseEntity.status(400).build();
        }
    }

    private ResponseEntity<Void> processEvent(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            String type = root.path("type").asText();
            if (type == null || type.isBlank()) return ResponseEntity.ok().build();
            switch (type) {
                case "checkout.session.completed" -> handleCheckoutSession(root);
                case "customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.created" -> handleSubscription(root);
                default -> log.trace("Evento Stripe ignorado: {}", type);
            }
        } catch (Exception e) {
            log.error("Erro processando webhook Stripe", e);
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok().build();
    }

    private void handleCheckoutSession(JsonNode root) {
        // Aqui poderia mapear customer <-> user se necessário (ex: salvar stripe_customer_id preliminar)
        log.debug("checkout.session.completed recebido");
    }

    private void handleSubscription(JsonNode root) {
        JsonNode dataObj = root.path("data").path("object");
        String status = dataObj.path("status").asText(null);
        String subscriptionId = dataObj.path("id").asText(null);
        String customerId = dataObj.path("customer").asText(null);
        long periodEnd = dataObj.path("current_period_end").asLong(0);
        JsonNode items = dataObj.path("items").path("data");
        String priceId = null;
        if (items.isArray() && !items.isEmpty()) {
            priceId = items.get(0).path("price").path("id").asText(null);
        }
        String userId = dataObj.path("metadata").path("user_id").asText(null);
        if (userId == null || userId.isBlank()) {
            log.warn("Webhook subscription sem metadata.user_id – ignorando");
            return;
        }
        Long periodEndEpoch = periodEnd > 0 ? periodEnd : null;
        subscriptionService.applyStripeWebhook(priceId, customerId, subscriptionId, periodEndEpoch, status, userId);
        log.debug("Subscription atualizada user={} planPrice={} status={} subId={}", userId, priceId, status, subscriptionId);
    }
}
