package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.BazaarItemHourSummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface BazaarItemHourSummaryRepository extends JpaRepository<BazaarItemHourSummary, Long> {
    Optional<BazaarItemHourSummary> findByProductIdAndHourStart(String productId, Instant hourStart);
}
