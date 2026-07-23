package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.ReferralConversion;
import com.modernbazaar.core.repository.projection.ReferralUserStatRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ReferralConversionRepository extends JpaRepository<ReferralConversion, Long> {
    boolean existsByReferredUserId(String referredUserId);

    /**
     * Each converted (first-paid) referred user with their LATEST subscription
     * state, tagged with the referring code. Drives the affiliate overview:
     * plan mix, active count, revenue, and last-seen usage per creator.
     */
    @Query(value = """
        select rc.code                 as code,
               ls.plan_slug            as plan,
               ls.status               as status,
               ls.last_seen_at         as lastSeen,
               ls.current_period_end   as periodEnd
        from   referral_conversion rc
        join   lateral (
                 select plan_slug, status, last_seen_at, current_period_end
                 from   user_subscription us
                 where  us.user_id = rc.referred_user_id
                 order  by us.id desc
                 limit  1
               ) ls on true
        """, nativeQuery = true)
    List<ReferralUserStatRow> referredUserStats();
}
