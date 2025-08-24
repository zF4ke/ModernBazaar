package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.BazaarItemHourSummary;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BazaarItemHourSummaryRepository extends JpaRepository<BazaarItemHourSummary, Long> {
    Optional<BazaarItemHourSummary> findByProductIdAndHourStart(String productId, Instant hourStart);

    Optional<BazaarItemHourSummary> findTopByProductIdOrderByHourStartDesc(String productId);

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

    /** fetch-minutes without order books */
    @EntityGraph(attributePaths = {"item","points"})
    @Query("""
        select distinct hs
        from   BazaarItemHourSummary hs
               left join fetch hs.points p
        where  hs.productId = :pid
          and  hs.hourStart >= :from
          and  hs.hourStart <  :to
        order  by hs.hourStart asc
        """)
    List<BazaarItemHourSummary> findRangeWithPoints(@Param("pid")  String pid,
                                                    @Param("from") Instant from,
                                                    @Param("to")   Instant to);

    @Query(value = """
        select distinct on (hs.product_id) hs.*
        from   bazaar_hour_summary hs
        where  hs.product_id in (:ids)
        order  by hs.product_id, hs.hour_start desc
        """, nativeQuery = true)
    List<BazaarItemHourSummary> findLatestByProductIds(@Param("ids") Collection<String> ids);

    @Query("""
        select s
        from   BazaarItemHourSummary s
        where  s.productId = :productId
        order  by s.hourStart desc
        """)
    List<BazaarItemHourSummary> findLastByProductId(@Param("productId") String productId, Pageable pageable);

    /** Retention: delete hour summaries older than cutoff */
    void deleteByHourStartBefore(Instant cutoff);

    @Query(value = """
        with ranked as (
          select hs.id,
                 hs.product_id,
                 hs.hour_start,
                 hs.open_instant_buy_price,
                 hs.close_instant_buy_price,
                 hs.min_instant_buy_price,
                 hs.max_instant_buy_price,
                 hs.open_instant_sell_price,
                 hs.close_instant_sell_price,
                 hs.min_instant_sell_price,
                 hs.max_instant_sell_price,
                 hs.created_buy_orders,
                 hs.delta_buy_orders,
                 hs.created_sell_orders,
                 hs.delta_sell_orders,
                 hs.added_items_buy_orders,
                 hs.added_items_sell_orders,
                 hs.insta_sold_items,
                 hs.insta_bought_items,
                 row_number() over (partition by hs.product_id order by hs.hour_start desc) as rn
          from bazaar_hour_summary hs
          where hs.product_id in (:ids)
        )
        select id,
               product_id,
               hour_start,
               open_instant_buy_price,
               close_instant_buy_price,
               min_instant_buy_price,
               max_instant_buy_price,
               open_instant_sell_price,
               close_instant_sell_price,
               min_instant_sell_price,
               max_instant_sell_price,
               created_buy_orders,
               delta_buy_orders,
               created_sell_orders,
               delta_sell_orders,
               added_items_buy_orders,
               added_items_sell_orders,
               insta_sold_items,
               insta_bought_items
        from ranked
        where rn <= :window
        """, nativeQuery = true)
    List<BazaarItemHourSummary> findLastWindowByProductIds(@Param("ids") Collection<String> ids,
                                                           @Param("window") int windowHours);
}
