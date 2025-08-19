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

public interface BazaarProductSnapshotRepository
        extends JpaRepository<BazaarItemSnapshot, Long> {

    /* ───────────────────── EXISTENCE ───────────────────── */

    boolean existsByProductIdAndLastUpdated(String productId, Instant lastUpdated);

    /*
     * NOTE:  ⚠️  This method USED TO join‑fetch the two collection associations
     *        (buyOrders & sellOrders) while also relying on Spring‑Data's
     *        implicit LIMIT 1. That combination is exactly what triggers the
     *        Hibernate warning  —  "firstResult/maxResults specified with
     *        collection fetch; applying in memory" (HHH90003004).
     *
     *        We removed the @EntityGraph so that only the root Snapshot entity
     *        is fetched here. A second query (see findWithOrdersById) brings
     *        the two collections, avoiding the JOIN‑FETCH + LIMIT pattern that
     *        causes the warning.
     */
    Optional<BazaarItemSnapshot> findTopByProductIdOrderByFetchedAtDesc(String productId);

    /*
     * Second step of the 2‑query approach recommended by Vlad Mihalcea and
     * Enis Serbest: fetch the same Snapshot *without* pagination but this time
     * eagerly loading its collections. Because we filter by the primary‑key
     * (id) no LIMIT/OFFSET is applied and therefore no warning is raised.
     */
    @EntityGraph(attributePaths = {"buyOrders", "sellOrders"})
    @Query("""
        select s
        from   BazaarItemSnapshot s
               left join fetch s.buyOrders
               left join fetch s.sellOrders
        where  s.id = :id
        """)
    Optional<BazaarItemSnapshot> findWithOrdersById(@Param("id") Long id);

    /* ───────────────────── MISC. EXISTING METHODS ───────────────────── */

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
            @Param("q")        String q,
            @Param("minSell")  Double minSell,
            @Param("maxSell")  Double maxSell,
            @Param("minBuy")   Double minBuy,
            @Param("maxBuy")   Double maxBuy,
            @Param("minSpread") Double minSpread
    );

    /* 2‑query pagination helpers ————————————————————————— */

    /**
     * Lightweight first step: get only the *product IDs* that match the filter
     *   and should appear on the requested page. No collection joins here, so
     *   it is safe to apply LIMIT/OFFSET directly.
     */
    @Query(value = """
        select id
        from (
          select distinct on (s.product_id)
                 s.product_id           as id,
                 s.fetched_at           as latest_time
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
        ) ids
        order by latest_time desc
        limit  :limit
        offset :offset
        """, nativeQuery = true)
    List<String> findLatestProductIdsPaged(@Param("q")        String q,
                                           @Param("minSell")  Double minSell,
                                           @Param("maxSell")  Double maxSell,
                                           @Param("minBuy")   Double minBuy,
                                           @Param("maxBuy")   Double maxBuy,
                                           @Param("minSpread") Double minSpread,
                                           @Param("limit")    int limit,
                                           @Param("offset")   int offset);

    /** Second step: pull the *latest* Snapshot row for each product in :ids. */
    @Query(value = """
        select distinct on (s.product_id) s.*
        from   bazaar_product_snapshot s
        where  s.product_id in (:ids)
        order  by s.product_id, s.fetched_at desc
        """, nativeQuery = true)
    List<BazaarItemSnapshot> findLatestByProductIds(@Param("ids") Collection<String> ids);

    /**
     * Count + page IDs in one go using CTEs. Returns rows with the product id
     * and the same totalCount value on each row (size of the filtered set).
     */
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

    /** **NEW** — count of distinct product IDs that satisfy the same filters. */
    @Query(value = """
        select count(*) from (
          select distinct on (s.product_id) s.product_id
          from   bazaar_product_snapshot s
                 left join skyblock_item si on si.id = s.product_id
          where  (:q is null
                    or si.name ilike concat('%', :q, '%')
                    or s.product_id ilike concat('%', :q, '%'))
            and  (:minSell  is null or s.weighted_two_percent_sell_price >= :minSell)
            and  (:maxSell  is null or s.weighted_two_percent_sell_price <= :maxSell)
            and  (:minBuy   is null or s.weighted_two_percent_buy_price  >= :minBuy)
            and  (:maxBuy   is null or s.weighted_two_percent_buy_price  <= :maxBuy)
            and  (:minSpread is null
                    or (s.weighted_two_percent_sell_price - s.weighted_two_percent_buy_price) >= :minSpread)
        ) sub
        """, nativeQuery = true)
    long countFilteredProducts(@Param("q")        String q,
                               @Param("minSell")  Double minSell,
                               @Param("maxSell")  Double maxSell,
                               @Param("minBuy")   Double minBuy,
                               @Param("maxBuy")   Double maxBuy,
                               @Param("minSpread") Double minSpread);

    /* ───────────────────── AGGREGATIONS & STREAMS (unchanged) ───────────────────── */

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

    @Query("""
        select s
        from   BazaarItemSnapshot s
        where  s.productId = :productId
          and  s.fetchedAt >= :from and s.fetchedAt < :to
        order by s.fetchedAt
        """)
    @QueryHints({
            @QueryHint(name = org.hibernate.jpa.QueryHints.HINT_FETCH_SIZE, value = "256")
    })
    Stream<BazaarItemSnapshot> streamHourForProduct(@Param("productId") String productId,
                                                    @Param("from")      Instant from,
                                                    @Param("to")        Instant to);

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
}