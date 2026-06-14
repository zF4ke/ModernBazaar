package com.modernbazaar.core.repository;

import com.modernbazaar.core.domain.UserSubscription;
import com.modernbazaar.core.repository.projection.DayCountRow;
import com.modernbazaar.core.repository.projection.LabelCountRow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, Long> {
    Optional<UserSubscription> findFirstByUserIdOrderByIdDesc(String userId);

    Page<UserSubscription> findByUserIdContainingIgnoreCase(String userId, Pageable pageable);

    /** Admin search across user id, email and display name. */
    @Query("""
        select u from UserSubscription u
        where lower(u.userId) like lower(concat('%', :q, '%'))
           or lower(coalesce(u.email, '')) like lower(concat('%', :q, '%'))
           or lower(coalesce(u.name, '')) like lower(concat('%', :q, '%'))
        """)
    Page<UserSubscription> search(@Param("q") String q, Pageable pageable);

    /* ───────────────────── admin analytics ───────────────────── */

    @Query(value = "select count(distinct user_id) from user_subscription", nativeQuery = true)
    long countDistinctUsers();

    /** Paying active subscriptions only (free plan is not a "subscription"). */
    @Query(value = "select count(*) from user_subscription where status = 'active' and plan_slug <> 'free'", nativeQuery = true)
    long countActive();

    @Query(value = """
        select count(*) from user_subscription
        where status = 'canceled' and updated_at >= now() - (:days * interval '1 day')
        """, nativeQuery = true)
    long countCanceledWithinDays(@Param("days") int days);

    /** Plan distribution over each user's most recent subscription. */
    @Query(value = """
        with latest as (
          select distinct on (user_id) user_id, plan_slug
          from   user_subscription
          order  by user_id, id desc
        )
        select plan_slug as label, count(*) as cnt
        from   latest
        group  by plan_slug
        order  by cnt desc
        """, nativeQuery = true)
    List<LabelCountRow> planDistribution();

    @Query(value = "select status as label, count(*) as cnt from user_subscription group by status order by cnt desc",
           nativeQuery = true)
    List<LabelCountRow> statusBreakdown();

    /** Daily new subscriptions for the last :days days. */
    @Query(value = """
        select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day, count(*) as cnt
        from   user_subscription
        where  created_at >= now() - (:days * interval '1 day')
        group  by 1
        order  by 1
        """, nativeQuery = true)
    List<DayCountRow> signupsTrend(@Param("days") int days);
}
