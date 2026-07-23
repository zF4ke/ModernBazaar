package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.ReferralClick;
import com.modernbazaar.core.repository.projection.LabelCountRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReferralClickRepository extends JpaRepository<ReferralClick, Long> {
    boolean existsByCodeAndVisitorKey(String code, String visitorKey);

    @Modifying
    @Query(value = """
        insert into referral_click (code, visitor_key, clicked_at)
        values (:code, :visitorKey, now())
        on conflict (code, visitor_key) where visitor_key is not null do nothing
        """, nativeQuery = true)
    void insertDeduplicated(@Param("code") String code, @Param("visitorKey") String visitorKey);

    /** Deduplicated referred visitors per code, for conversion rate. */
    @Query("select rc.code as label, count(rc) as cnt from ReferralClick rc group by rc.code")
    List<LabelCountRow> clickCountsByCode();
}
