package com.modernbazaar.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.modernbazaar.core.domain.ReferralConversion;
import com.modernbazaar.core.domain.ReferralEarning;
import com.modernbazaar.core.repository.ReferralConversionRepository;
import com.modernbazaar.core.repository.ReferralEarningRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReferralEarningServiceTest {
    @Mock ReferralConversionRepository conversions;
    @Mock ReferralEarningRepository earnings;
    ReferralEarningService service;
    ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        service = new ReferralEarningService(conversions, earnings);
        ReflectionTestUtils.setField(service, "revSharePct", 30);
        ReflectionTestUtils.setField(service, "holdDays", 30);
    }

    @Test
    void paidInvoiceUsesSubtotalExcludingTaxAndCreatesCommission() throws Exception {
        when(earnings.findByStripeInvoiceId("in_1")).thenReturn(Optional.empty());
        when(conversions.findByReferredUserId("auth0|user")).thenReturn(Optional.of(
                ReferralConversion.builder().code("CREATOR").referredUserId("auth0|user").build()));

        service.recordPaidInvoice(
                mapper.readTree("""
                    {"id":"in_1","subtotal":1200,"subtotal_excluding_tax":1000,
                     "currency":"usd","charge":"ch_1","status_transitions":{"paid_at":1700000000}}
                    """),
                mapper.readTree("{\"metadata\":{\"user_id\":\"auth0|user\"}}"));

        ArgumentCaptor<ReferralEarning> captor = ArgumentCaptor.forClass(ReferralEarning.class);
        verify(earnings).save(captor.capture());
        assertEquals(1000, captor.getValue().getNetRevenueCents());
        assertEquals(300, captor.getValue().getCommissionCents());
    }

    @Test
    void fullRefundReversesCommission() throws Exception {
        ReferralEarning earning = ReferralEarning.builder()
                .stripeInvoiceId("in_1").stripeChargeId("ch_1")
                .netRevenueCents(1000).commissionCents(300).status("earned").build();
        when(earnings.findByStripeInvoiceId("in_1")).thenReturn(Optional.of(earning));

        service.recordRefund(mapper.readTree(
                "{\"id\":\"ch_1\",\"invoice\":\"in_1\",\"amount_refunded\":1200}"));

        assertEquals(1000, earning.getRefundedCents());
        assertEquals(0, earning.getCommissionCents());
        assertEquals("refunded", earning.getStatus());
        verify(earnings).save(earning);
    }
}
