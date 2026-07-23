package com.modernbazaar.core.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.modernbazaar.core.domain.ReferralEarning;
import com.modernbazaar.core.repository.ReferralConversionRepository;
import com.modernbazaar.core.repository.ReferralEarningRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReferralEarningService {
    private final ReferralConversionRepository conversionRepository;
    private final ReferralEarningRepository earningRepository;

    @Value("${referral.rev-share-pct:30}")
    private int revSharePct;

    @Value("${referral.hold-days:30}")
    private int holdDays;

    @Transactional
    public void recordPaidInvoice(JsonNode invoice, JsonNode subscription) {
        String invoiceId = text(invoice, "id");
        if (invoiceId == null || earningRepository.findByStripeInvoiceId(invoiceId).isPresent()) return;

        String userId = text(subscription.path("metadata"), "user_id");
        if (userId == null) return;
        var conversion = conversionRepository.findByReferredUserId(userId).orElse(null);
        if (conversion == null) return;

        long netRevenue = positiveLong(invoice, "subtotal_excluding_tax");
        if (netRevenue == 0) netRevenue = positiveLong(invoice, "subtotal");
        if (netRevenue == 0) return;

        OffsetDateTime occurredAt = timestamp(invoice.path("status_transitions").path("paid_at"));
        if (occurredAt == null) occurredAt = OffsetDateTime.now(ZoneOffset.UTC);
        long commission = Math.round(netRevenue * (revSharePct / 100.0));

        earningRepository.save(ReferralEarning.builder()
                .stripeInvoiceId(invoiceId)
                .stripeChargeId(text(invoice, "charge"))
                .code(conversion.getCode())
                .referredUserId(userId)
                .currency(defaultString(text(invoice, "currency"), "unknown"))
                .netRevenueCents(netRevenue)
                .refundedCents(0)
                .commissionCents(commission)
                .occurredAt(occurredAt)
                .eligibleAt(occurredAt.plusDays(holdDays))
                .status("earned")
                .build());
    }

    @Transactional
    public void recordRefund(JsonNode charge) {
        String invoiceId = text(charge, "invoice");
        String chargeId = text(charge, "id");
        ReferralEarning earning = invoiceId == null
                ? null
                : earningRepository.findByStripeInvoiceId(invoiceId).orElse(null);
        if (earning == null && chargeId != null) {
            earning = earningRepository.findFirstByStripeChargeId(chargeId).orElse(null);
        }
        if (earning == null) {
            log.debug("Refund has no attributed referral earning (invoice={}, charge={})", invoiceId, chargeId);
            return;
        }

        long refunded = Math.min(positiveLong(charge, "amount_refunded"), earning.getNetRevenueCents());
        earning.setRefundedCents(refunded);
        long remainingRevenue = Math.max(0, earning.getNetRevenueCents() - refunded);
        earning.setCommissionCents(Math.round(remainingRevenue * (revSharePct / 100.0)));
        earning.setStatus(refunded >= earning.getNetRevenueCents() ? "refunded" : "partially_refunded");
        earningRepository.save(earning);
    }

    private static long positiveLong(JsonNode node, String field) {
        long value = node.path(field).asLong(0);
        return Math.max(0, value);
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() || value.asText().isBlank() ? null : value.asText();
    }

    private static String defaultString(String value, String fallback) {
        return value == null ? fallback : value;
    }

    private static OffsetDateTime timestamp(JsonNode value) {
        if (value == null || !value.canConvertToLong() || value.asLong() <= 0) return null;
        return OffsetDateTime.ofInstant(Instant.ofEpochSecond(value.asLong()), ZoneOffset.UTC);
    }
}
