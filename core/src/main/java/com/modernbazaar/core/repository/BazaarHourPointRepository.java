package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.BazaarItemHourPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

public interface BazaarHourPointRepository
        extends JpaRepository<BazaarItemHourPoint,Long> {

    @Modifying
    @Transactional
    @Query(value = """
        /* delete order-book rows tied to old hour points */
        delete from bazaar_order_entry
         where hour_point_id in (
           select hp.id
           from   bazaar_hour_point hp
                  join bazaar_hour_summary hs on hs.id = hp.bazaar_hour_summary
           where  hs.hour_start < :cutoff
         );
        /* then delete the hour points themselves */
        delete from bazaar_hour_point hp
          using bazaar_hour_summary hs
         where hp.bazaar_hour_summary = hs.id
           and hs.hour_start < :cutoff;
        """, nativeQuery = true)
    void cascadeDeleteBySummaryHourStartBefore(@Param("cutoff") Instant cutoff);

    /**
     * Count hour points older than the given cutoff time for retention purposes
     */
    @Query("select count(hp) from BazaarItemHourPoint hp join hp.hourSummary hs where hs.hourStart < :cutoff")
    long countBySummaryHourStartBefore(@Param("cutoff") Instant cutoff);
}
