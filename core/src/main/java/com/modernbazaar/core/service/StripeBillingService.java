package com.modernbazaar.core.service;

import com.stripe.exception.StripeException;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.param.SubscriptionUpdateParams;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Thin wrapper over the Stripe SDK for Managed Payments (Merchant of Record):
 * creating Checkout Sessions, Customer-Portal sessions, and toggling
 * cancel-at-period-end. The global API key is set by {@link com.modernbazaar.core.config.StripeConfig}.
 *
 * With Managed Payments enabled on the Stripe account, Stripe is the seller of
 * record and handles tax calculation/registration/remittance automatically — we
 * don't compute tax here.
 */
@Service
@Slf4j
public class StripeBillingService {

    @Value("${stripe.secret-key:}")
    private String secretKey;

    @Value("${stripe.success-url:}")
    private String successUrl;

    @Value("${stripe.cancel-url:}")
    private String cancelUrl;

    @Value("${stripe.portal-return-url:}")
    private String portalReturnUrl;

    /** True when a Stripe secret key is configured (billing can actually call Stripe). */
    public boolean isConfigured() {
        return secretKey != null && !secretKey.isBlank();
    }

    /**
     * Create a subscription-mode Checkout Session for the given plan price and return its URL.
     * Carries the account on both the session ({@code client_reference_id} + metadata) and the
     * resulting subscription ({@code subscription_data.metadata.user_id}) so later subscription
     * webhooks can attribute the account without a session lookup. {@code ref} (optional) is the
     * referral/affiliate code, threaded through for {@link ReferralService#recordConversion}.
     */
    public String createCheckoutSession(String priceId, String userId, String email,
                                        String existingCustomerId, String ref) throws StripeException {
        SessionCreateParams.SubscriptionData.Builder subData =
                SessionCreateParams.SubscriptionData.builder().putMetadata("user_id", userId);
        if (ref != null && !ref.isBlank()) subData.putMetadata("ref", ref);

        SessionCreateParams.Builder params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                .setClientReferenceId(userId)
                .setAllowPromotionCodes(true) // Stripe-native coupons/promo codes (replaces local discount codes)
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setPrice(priceId)
                        .setQuantity(1L)
                        .build())
                .putMetadata("user_id", userId)
                .setSubscriptionData(subData.build());
        if (ref != null && !ref.isBlank()) params.putMetadata("ref", ref);

        // Reuse the existing Stripe customer (avoids duplicate customers on upgrade); otherwise
        // pass the email so Stripe creates/links one. Don't set both — Stripe rejects that.
        // Only reuse a real Stripe customer id (cus_…): legacy rows may still hold a Lemon
        // Squeezy numeric customer id, which Stripe rejects with "No such customer".
        if (existingCustomerId != null && existingCustomerId.startsWith("cus_")) {
            params.setCustomer(existingCustomerId);
        } else if (email != null && !email.isBlank()) {
            params.setCustomerEmail(email);
        }

        Session session = Session.create(params.build());
        return session.getUrl();
    }

    /**
     * Create a Customer-Portal session (manage payment method, invoices, cancel) and return its URL.
     * Returns null if the user has no Stripe customer id yet.
     */
    public String createPortalSession(String customerId) throws StripeException {
        // Only a real Stripe customer id (cus_…) has a portal; null/blank or a legacy
        // Lemon Squeezy numeric id means the user has no Stripe billing account yet.
        if (customerId == null || !customerId.startsWith("cus_")) return null;
        com.stripe.model.billingportal.Session portal = com.stripe.model.billingportal.Session.create(
                com.stripe.param.billingportal.SessionCreateParams.builder()
                        .setCustomer(customerId)
                        .setReturnUrl(portalReturnUrl)
                        .build());
        return portal.getUrl();
    }

    /**
     * Toggle {@code cancel_at_period_end} on a Stripe subscription: {@code true} schedules
     * cancellation at period end (access continues until then), {@code false} resumes (un-cancels).
     * Returns false on missing id / not-configured / API error.
     */
    public boolean setCancelAtPeriodEnd(String subscriptionId, boolean cancel) {
        if (!isConfigured() || subscriptionId == null || subscriptionId.isBlank()) return false;
        try {
            Subscription sub = Subscription.retrieve(subscriptionId);
            sub.update(SubscriptionUpdateParams.builder().setCancelAtPeriodEnd(cancel).build());
            return true;
        } catch (StripeException e) {
            log.warn("Stripe {} failed for subscription {}: {}", cancel ? "cancel" : "resume", subscriptionId, e.getMessage());
            return false;
        }
    }

    /** Retrieve a Stripe subscription (used by the webhook to read price/period/status/metadata). */
    public Subscription retrieveSubscription(String subscriptionId) throws StripeException {
        return Subscription.retrieve(subscriptionId);
    }
}
