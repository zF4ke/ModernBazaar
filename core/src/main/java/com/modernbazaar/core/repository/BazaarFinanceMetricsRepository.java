package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.BazaarFinanceMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BazaarFinanceMetricsRepository extends JpaRepository<BazaarFinanceMetrics, Long> {
    List<BazaarFinanceMetrics> findByWindowHoursAndProductIdIn(int windowHours, Collection<String> productIds);

    @Query("select m from BazaarFinanceMetrics m where m.windowHours in :windows and m.productId in :ids")
    List<BazaarFinanceMetrics> findByWindowHoursInAndProductIdIn(@Param("windows") Collection<Integer> windows,
                                                                 @Param("ids") Collection<String> ids);

    Optional<BazaarFinanceMetrics> findByProductIdAndWindowHours(String productId, int windowHours);
}
