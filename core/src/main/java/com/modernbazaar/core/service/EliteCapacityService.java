package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.EliteCheckoutReservation;
import com.modernbazaar.core.repository.EliteCheckoutReservationRepository;
import com.modernbazaar.core.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class EliteCapacityService {
    private final EliteCheckoutReservationRepository reservations;
    private final UserSubscriptionRepository subscriptions;
    private final JdbcTemplate jdbcTemplate;

    @Value("${elite.max-active-subscribers:100}")
    private int maxActiveSubscribers;

    @Value("${elite.checkout-reservation-hours:24}")
    private int reservationHours;

    @Transactional
    public void reserve(String userId) {
        jdbcTemplate.queryForObject("select pg_advisory_xact_lock(hashtext('modern-bazaar-elite-capacity'))", Long.class);
        OffsetDateTime now = OffsetDateTime.now();
        reservations.deleteExpired(now);

        if (subscriptions.isLatestActiveElite(userId)) return;
        var existing = reservations.findById(userId).orElse(null);
        if (existing != null && existing.getExpiresAt().isAfter(now)) return;

        long occupied = subscriptions.countLatestActiveElite() + reservations.countByExpiresAtAfter(now);
        if (occupied >= maxActiveSubscribers) {
            throw new CapacityFullException("Elite is currently full");
        }
        reservations.save(EliteCheckoutReservation.builder()
                .userId(userId)
                .expiresAt(now.plusHours(reservationHours))
                .build());
    }

    @Transactional
    public void release(String userId) {
        if (userId != null && !userId.isBlank()) reservations.deleteById(userId);
    }

    public static class CapacityFullException extends RuntimeException {
        public CapacityFullException(String message) {
            super(message);
        }
    }
}
