package com.modernbazaar.core.api.dto;

import java.util.List;

/**
 * Read-only growth/usage snapshot for the admin analytics dashboard.
 * MRR is intentionally omitted until plans carry a price amount.
 */
public record AdminAnalyticsSummaryDTO(
        long totalUsers,
        long activeSubscriptions,
        long canceledLast30d,
        int  totalPlans,
        List<NamedCount> planDistribution,   // by each user's latest plan
        List<NamedCount> statusBreakdown,
        List<DayCount>   signupsTrend         // last N days
) {
    public record NamedCount(String label, long count) {}
    public record DayCount(String day, long count) {}
}
