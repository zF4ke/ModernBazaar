package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.BazaarItemSnapshot;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

public interface BazaarProductSnapshotRepository
        extends JpaRepository<BazaarItemSnapshot, Long> {

    boolean existsByProductIdAndLastUpdated(String productId, Instant lastUpdated);

    @EntityGraph(attributePaths = {"buyOrders","sellOrders"})
    Optional<BazaarItemSnapshot> findTopByProductIdOrderByFetchedAtDesc(String productId);

    void deleteByFetchedAtBefore(Instant cutoff);

    @Query("select min(s.fetchedAt) from BazaarItemSnapshot s")
    Instant findOldestFetchedAt();

    @Query(value = """

            select distinct on (s.product_id) s.*
        from bazaar_product_snapshot s
        left join skyblock_item si on si.id = s.product_id   -- ← join for name
        where ( :q is null
                or si.name ilike concat('%', :q, '%')
                or s.product_id ilike concat('%', :q, '%') )
          and ( :minSell  is null or s.weighted_two_percent_sell_price >= :minSell )
          and ( :maxSell  is null or s.weighted_two_percent_sell_price <= :maxSell )
          and ( :minBuy   is null or s.weighted_two_percent_buy_price  >= :minBuy  )
          and ( :maxBuy   is null or s.weighted_two_percent_buy_price  <= :maxBuy  )
          and ( :minSpread is null
                or (s.weighted_two_percent_sell_price - s.weighted_two_percent_buy_price) >= :minSpread )
        order by s.product_id, s.fetched_at desc
        """, nativeQuery = true)
    List<BazaarItemSnapshot> searchLatest(
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



// huge memory usage, so we don't use it
//    @EntityGraph(attributePaths = {"buyOrders", "sellOrders"})
//    List<BazaarItemSnapshot> findAllByFetchedAtBetween(Instant from, Instant to);

    @Query("""
        select s
        from BazaarItemSnapshot s
        where s.productId = :productId
          and s.fetchedAt >= :from and s.fetchedAt < :to
        order by s.fetchedAt
        """)
    @QueryHints({
            @QueryHint( name = org.hibernate.jpa.QueryHints.HINT_FETCH_SIZE , value = "256" )
    })
    Stream<BazaarItemSnapshot> streamHourForProduct(@Param("productId") String productId,
                                                    @Param("from") Instant from,
                                                    @Param("to")   Instant to);

    @Query("""
        select distinct s.productId
        from BazaarItemSnapshot s
        where s.fetchedAt >= :from and s.fetchedAt < :to
        """)
    List<String> findProductIdsInHour(@Param("from") Instant from,
                                      @Param("to")   Instant to);



    @Modifying @Transactional
    @Query(value = """
        /* 1️⃣ orders first */
        delete from bazaar_order_entry
         where snapshot_id in (
               select id from bazaar_product_snapshot
                where fetched_at >= :from and fetched_at < :to
         );
        /* 2️⃣ now the parents */
        delete from bazaar_product_snapshot
         where fetched_at >= :from and fetched_at < :to;
        """, nativeQuery = true)
    void cascadeDeleteHour(@Param("from") Instant from,
                           @Param("to")   Instant to);
}
