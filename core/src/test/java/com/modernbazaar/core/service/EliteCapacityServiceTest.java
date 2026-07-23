package com.modernbazaar.core.service;

import com.modernbazaar.core.repository.EliteCheckoutReservationRepository;
import com.modernbazaar.core.repository.UserSubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EliteCapacityServiceTest {
    @Mock EliteCheckoutReservationRepository reservations;
    @Mock UserSubscriptionRepository subscriptions;
    @Mock JdbcTemplate jdbcTemplate;
    EliteCapacityService service;

    @BeforeEach
    void setUp() {
        service = new EliteCapacityService(reservations, subscriptions, jdbcTemplate);
        ReflectionTestUtils.setField(service, "maxActiveSubscribers", 100);
        ReflectionTestUtils.setField(service, "reservationHours", 24);
    }

    @Test
    void rejectsCheckoutWhenCapacityIsFull() {
        when(subscriptions.isLatestActiveElite("user")).thenReturn(false);
        when(reservations.findById("user")).thenReturn(java.util.Optional.empty());
        when(subscriptions.countLatestActiveElite()).thenReturn(99L);
        when(reservations.countByExpiresAtAfter(any(OffsetDateTime.class))).thenReturn(1L);

        assertThrows(EliteCapacityService.CapacityFullException.class, () -> service.reserve("user"));
        verify(jdbcTemplate).execute("select pg_advisory_xact_lock(hashtext('modern-bazaar-elite-capacity'))");
        verify(reservations, never()).save(any());
    }
}
