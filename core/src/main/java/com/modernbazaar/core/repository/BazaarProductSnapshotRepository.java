package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.BazaarItemSnapshot;
import com.modernbazaar.core.repository.projection.PagedIdRow;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;

public interface BazaarProductSnapshotRepository
        extends JpaRepository<BazaarItemSnapshot, Long> {

    boolean existsByProductIdAndLastUpdated(String productId, Instant lastUpdated);

    Optional<BazaarItemSnapshot> findTopByProductIdOrderByFetchedAtDesc(String productId);

    @EntityGraph(attributePaths = {"buyOrders", "sellOrders"})
    @Query("""
        select s
        from   BazaarItemSnapshot s
               left join fetch s.buyOrders
               left join fetch s.sellOrders
        where  s.id = :id
        """)
    Optional<BazaarItemSnapshot> findWithOrdersById(@Param("id") Long id);

    @Query("select min(s.fetchedAt) from BazaarItemSnapshot s")
    Instant findOldestFetchedAt();

    @Query("""
        select s from BazaarItemSnapshot s
        where s.productId = :productId
        and s.fetchedAt >= :fromTime
        order by s.fetchedAt desc
        """)
    List<BazaarItemSnapshot> findLatestSnapshotsByProductId(
            @Param("productId") String productId,
            @Param("fromTime") Instant fromTime,
            Pageable pageable
    );

    default List<BazaarItemSnapshot> findLatestSnapshotsByProductId(String productId, Instant fromTime, int limit) {
        return findLatestSnapshotsByProductId(productId, fromTime, PageRequest.of(0, limit));
    }

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
            @Param("q")        String q,
            @Param("minSell")  Double minSell,
            @Param("maxSell")  Double maxSell,
            @Param("minBuy")   Double minBuy,
            @Param("maxBuy")   Double maxBuy,
            @Param("minSpread") Double minSpread
    );

    @Query(value = """
        select distinct on (s.product_id) s.*
        from   bazaar_product_snapshot s
        where  s.product_id in (:ids)
        order  by s.product_id, s.fetched_at desc
        """, nativeQuery = true)
    List<BazaarItemSnapshot> findLatestByProductIds(@Param("ids") Collection<String> ids);

    @Query(value = """
        with filtered as (
          select distinct on (s.product_id)
                 s.product_id as id,
                 s.fetched_at as latest_time
          from   bazaar_product_snapshot s
                 left join skyblock_item si on si.id = s.product_id
          where  (:q is null
                    or si.name ilike concat('%', :q, '%')
                    or s.product_id ilike concat('%', :q, '%'))
            and  (:minSell  is null or s.weighted_two_percent_sell_price >= :minSell)
            and  (:maxSell  is null or s.weighted_two_percent_sell_price <= :maxSell)
            and  (:minBuy   is null or s.weighted_two_percent_buy_price  >= :minBuy)
            and  (:maxBuy   is null or s.weighted_two_percent_buy_price  <= :maxBuy)
            and  (:minSpread is null or (s.weighted_two_percent_sell_price - s.weighted_two_percent_buy_price) >= :minSpread)
          order by s.product_id, s.fetched_at desc
        ), paged as (
          select id, latest_time
          from   filtered
          order  by latest_time desc
          limit  :limit
          offset :offset
        )
        select p.id as id,
               p.latest_time as latest_time,
               (select count(*) from filtered) as totalCount
        from   paged p
        order  by p.latest_time desc
        """, nativeQuery = true)
    List<PagedIdRow> findLatestProductIdsPagedWithTotal(@Param("q")        String q,
                                                        @Param("minSell")  Double minSell,
                                                        @Param("maxSell")  Double maxSell,
                                                        @Param("minBuy")   Double minBuy,
                                                        @Param("maxBuy")   Double maxBuy,
                                                        @Param("minSpread") Double minSpread,
                                                        @Param("limit")    int limit,
                                                        @Param("offset")   int offset);

    @Query(value = "select max(fetched_at) from bazaar_product_snapshot", nativeQuery = true)
    Optional<Instant> findLatestFetchTime();

    @Query(value = "select count(distinct product_id) from bazaar_product_snapshot", nativeQuery = true)
    int countDistinctProducts();

    @Query(value = """
        select coalesce(count(*), 0) from (
          select distinct on (product_id)
                 case
                   when weighted_two_percent_buy_price > weighted_two_percent_sell_price then 1
                   else 0
                 end as is_profitable
          from bazaar_product_snapshot
          where weighted_two_percent_buy_price > 0
            and weighted_two_percent_sell_price > 0
          order by product_id, fetched_at desc
        ) as latest where is_profitable = 1
        """, nativeQuery = true)
    Integer countProfitableItems();

    @Query(value = """
        with latest as (
          select distinct on (product_id)
                 case
                   when weighted_two_percent_buy_price > weighted_two_percent_sell_price
                   then (weighted_two_percent_buy_price - weighted_two_percent_sell_price) / weighted_two_percent_sell_price * 100
                   else 0
                 end as spread_percentage
          from bazaar_product_snapshot
          where weighted_two_percent_buy_price > 0
            and weighted_two_percent_sell_price > 0
          order by product_id, fetched_at desc
        )
        select coalesce(avg(spread_percentage), 0.0) from latest where spread_percentage > 0
        """, nativeQuery = true)
    Double calculateAverageProfitMargin();

    @Query("""
       select s
       from   BazaarItemSnapshot s
              left join fetch s.buyOrders
              left join fetch s.sellOrders
       where  s.productId = :productId
         and  s.fetchedAt >= :from
         and  s.fetchedAt <  :to
       order by s.fetchedAt asc
       """)
    @QueryHints({
            @QueryHint(name = org.hibernate.jpa.QueryHints.HINT_FETCH_SIZE, value = "256")
    })
    Stream<BazaarItemSnapshot> streamHourForProductWithOrders(@Param("productId") String productId,
                                                              @Param("from")      Instant from,
                                                              @Param("to")        Instant to);

    @Query("""
        select distinct s.productId
        from   BazaarItemSnapshot s
        where  s.fetchedAt >= :from and s.fetchedAt < :to
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

    @Modifying
    @Transactional
    @Query(value = """
        /* first delete order entries referencing old snapshots */
        delete from bazaar_order_entry
         where snapshot_id in (
           select id from bazaar_product_snapshot
            where fetched_at < :cutoff
         );
        /* then delete the snapshots */
        delete from bazaar_product_snapshot
         where fetched_at < :cutoff;
        """, nativeQuery = true)
    void cascadeDeleteByFetchedAtBefore(@Param("cutoff") Instant cutoff);
}