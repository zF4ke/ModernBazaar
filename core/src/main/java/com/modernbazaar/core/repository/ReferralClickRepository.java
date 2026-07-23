package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.ReferralClick;
import com.modernbazaar.core.repository.projection.LabelCountRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ReferralClickRepository extends JpaRepository<ReferralClick, Long> {

    /** Total clicks per code, for the overview and CTR. */
    @Query("select rc.code as label, count(rc) as cnt from ReferralClick rc group by rc.code")
    List<LabelCountRow> clickCountsByCode();
}
