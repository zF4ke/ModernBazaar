package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.EliteCheckoutReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;

public interface EliteCheckoutReservationRepository extends JpaRepository<EliteCheckoutReservation, String> {
    long countByExpiresAtAfter(OffsetDateTime now);

    @Modifying
    @Query("delete from EliteCheckoutReservation r where r.expiresAt <= :now")
    void deleteExpired(OffsetDateTime now);
}
