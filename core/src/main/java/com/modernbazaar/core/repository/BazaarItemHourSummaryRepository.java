package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.BazaarItemHourSummary;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.awt.print.Pageable;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BazaarItemHourSummaryRepository extends JpaRepository<BazaarItemHourSummary, Long> {
    Optional<BazaarItemHourSummary> findByProductIdAndHourStart(String productId, Instant hourStart);

    /* latest per product, optional filters */
    @Query(value = """
        select distinct on (hs.product_id) hs.*
        from   bazaar_hour_summary hs
               join bazaar_item bi on bi.product_id = hs.product_id
        where  (:q is null or bi.product_id ilike concat('%', :q, '%')
                          or hs.product_id ilike concat('%', :q, '%'))
          and  (:minSell is null or hs.close_instant_sell_price >= :minSell)
          and  (:maxSell is null or hs.close_instant_sell_price <= :maxSell)
          and  (:minBuy  is null or hs.close_instant_buy_price  >= :minBuy)
          and  (:maxBuy  is null or hs.close_instant_buy_price  <= :maxBuy)
          and  (:minSpread is null or (hs.close_instant_sell_price - hs.close_instant_buy_price) >= :minSpread)
        order by hs.product_id, hs.hour_start desc
        """, nativeQuery = true)
    List<BazaarItemHourSummary> searchLatest(@Param("q")         String q,
                                             @Param("minSell")   Double minSell,
                                             @Param("maxSell")   Double maxSell,
                                             @Param("minBuy")    Double minBuy,
                                             @Param("maxBuy")    Double maxBuy,
                                             @Param("minSpread") Double minSpread);

    @Query("""
        select s
        from   BazaarItemHourSummary s
        where  s.productId  = :productId
          and  s.hourStart  >= :from
          and  s.hourStart  <  :to
        order by s.hourStart asc
        """)
    List<BazaarItemHourSummary> findRange(
            @Param("productId") String productId,
            @Param("from")      Instant from,
            @Param("to")        Instant to);

    /** fetch-minutes + orders with distinct root to avoid join duplication */
    @EntityGraph(attributePaths = {"item","points","points.buyOrders","points.sellOrders"})
    @Query("""
        select distinct hs
        from   BazaarItemHourSummary hs
               left join fetch hs.points p
               left join fetch p.buyOrders
               left join fetch p.sellOrders
        where  hs.productId = :pid
          and  hs.hourStart >= :from
          and  hs.hourStart <  :to
        order  by hs.hourStart asc
        """)
    List<BazaarItemHourSummary> findRangeWithPoints(@Param("pid")  String pid,
                                                    @Param("from") Instant from,
                                                    @Param("to")   Instant to);

    @EntityGraph(attributePaths = {"item","points","points.buyOrders","points.sellOrders"})
    @Query("""
        select distinct hs
        from   BazaarItemHourSummary hs
               left join fetch hs.points p
               left join fetch p.buyOrders
               left join fetch p.sellOrders
        where  hs.productId = :pid
        order  by hs.hourStart desc
        """)
    List<BazaarItemHourSummary> findLatestWithPoints(@Param("pid") String pid);

    /** Lightweight helper for 2‑query pagination on the Live‑View list. */
    @Query(value = """
        select distinct on (hs.product_id) hs.*
        from   bazaar_hour_summary hs
        where  hs.product_id in (:ids)
        order  by hs.product_id, hs.hour_start desc
        """, nativeQuery = true)
    List<BazaarItemHourSummary> findLatestByProductIds(@Param("ids") Collection<String> ids);

    /** Get the last N hour summaries for a product, ordered by hour start descending */
    @Query("""
        select s
        from   BazaarItemHourSummary s
        where  s.productId = :productId
        order  by s.hourStart desc
        limit  :limit
        """)
    List<BazaarItemHourSummary> findLastNByProductId(
            @Param("productId") String productId,
            @Param("limit") int limit);
}
