package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.ReferralSignup;
import com.modernbazaar.core.repository.projection.LabelCountRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ReferralSignupRepository extends JpaRepository<ReferralSignup, Long> {

    boolean existsByUserId(String userId);

    /** Attributed signups per code, for the cockpit funnel. */
    @Query("select rs.code as label, count(rs) as cnt from ReferralSignup rs group by rs.code")
    List<LabelCountRow> signupCountsByCode();
}
