package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.BazaarProductSnapshot;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BazaarProductSnapshotRepository
        extends JpaRepository<BazaarProductSnapshot, Long> {

    boolean existsByProductIdAndLastUpdated(String productId, Instant lastUpdated);

    @EntityGraph(attributePaths = {"buyOrders","sellOrders"})
    Optional<BazaarProductSnapshot> findTopByProductIdOrderByFetchedAtDesc(String productId);

    void deleteByFetchedAtBefore(Instant cutoff);

    @Query(value = """
        select distinct on (s.product_id) s.*
        from bazaar_product_snapshot s
        join bazaar_item i on i.product_id = s.product_id
        where (:q is null or i.display_name ilike concat('%', :q, '%') or s.product_id ilike concat('%', :q, '%'))
          and (:minSell is null or s.weighted_two_percent_sell_price >= :minSell)
          and (:maxSell is null or s.weighted_two_percent_sell_price <= :maxSell)
          and (:minBuy  is null or s.weighted_two_percent_buy_price  >= :minBuy)
          and (:maxBuy  is null or s.weighted_two_percent_buy_price  <= :maxBuy)
          and (:minSpread is null or (s.weighted_two_percent_sell_price - s.weighted_two_percent_buy_price) >= :minSpread)
        order by s.product_id, s.fetched_at desc
        """, nativeQuery = true)
    List<BazaarProductSnapshot> searchLatest(
            @Param("q") String q,
            @Param("minSell") Double minSell,
            @Param("maxSell") Double maxSell,
            @Param("minBuy")  Double minBuy,
            @Param("maxBuy")  Double maxBuy,
            @Param("minSpread") Double minSpread
    );

    @Query(value = "select max(fetched_at) from bazaar_product_snapshot", nativeQuery = true)
    Optional<Instant> findLatestFetchTime();

    @Query(value = "select count(distinct product_id) from bazaar_product_snapshot", nativeQuery = true)
    int countDistinctProducts();

    @Query(value = """
        with latest as (
          select distinct on (product_id)
                 (weighted_two_percent_sell_price - weighted_two_percent_buy_price) as spread
          from bazaar_product_snapshot
          order by product_id, fetched_at desc
        )
        select avg(spread) from latest
        """, nativeQuery = true)
    double calculateAverageSpread();
}
