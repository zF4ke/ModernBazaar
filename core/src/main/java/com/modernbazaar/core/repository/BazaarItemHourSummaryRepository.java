package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.BazaarItemHourSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface BazaarItemHourSummaryRepository extends JpaRepository<BazaarItemHourSummary, Long> {
    Optional<BazaarItemHourSummary> findByProductIdAndHourStart(String productId, Instant hourStart);

    @Query("""
        select s from BazaarItemHourSummary s
        where s.productId = :productId
          and s.hourStart >= :from
          and s.hourStart <  :to
        order by s.hourStart asc
        """)
    List<BazaarItemHourSummary> findRange(
            @Param("productId") String productId,
            @Param("from")      Instant from,
            @Param("to")        Instant to);

    /** same, but fetch‑joins kept points when requested */
    @Query("""
        select distinct s from BazaarItemHourSummary s
        left join fetch s.points p
        where s.productId = :productId
          and s.hourStart >= :from
          and s.hourStart <  :to
        order by s.hourStart asc
        """)
    List<BazaarItemHourSummary> findRangeWithPoints(
            @Param("productId") String productId,
            @Param("from")      Instant from,
            @Param("to")        Instant to);
}
