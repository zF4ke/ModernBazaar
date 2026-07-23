package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.ReferralPayout;
import com.modernbazaar.core.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReferralAnalyticsServiceTest {
    @Mock ReferralCodeRepository codeRepo;
    @Mock ReferralConversionRepository conversionRepo;
    @Mock ReferralClickRepository clickRepo;
    @Mock ReferralPayoutRepository payoutRepo;
    @Mock ReferralEarningRepository earningRepo;
    @InjectMocks ReferralAnalyticsService service;

    @Test
    void recordClickDeduplicatesVisitorPerCode() {
        when(codeRepo.existsByCodeIgnoreCase("CREATOR")).thenReturn(true);
        service.recordClick("creator", "1234567890abcdef");

        verify(clickRepo).insertDeduplicated("CREATOR", "1234567890abcdef");
    }

    @Test
    void paidPayoutCannotBeDeleted() {
        when(payoutRepo.findById(7L)).thenReturn(Optional.of(
                ReferralPayout.builder().id(7L).status("paid").amountCents(1000).build()));

        assertThrows(IllegalStateException.class, () -> service.deletePayout(7L));
        verify(payoutRepo, never()).delete(any());
    }
}
