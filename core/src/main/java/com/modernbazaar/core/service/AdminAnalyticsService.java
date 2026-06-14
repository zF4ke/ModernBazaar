package com.modernbazaar.core.service;

import com.modernbazaar.core.api.dto.AdminAnalyticsSummaryDTO;
import com.modernbazaar.core.api.dto.AdminAnalyticsSummaryDTO.DayCount;
import com.modernbazaar.core.api.dto.AdminAnalyticsSummaryDTO.NamedCount;
import com.modernbazaar.core.repository.PlanRepository;
import com.modernbazaar.core.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminAnalyticsService {

    private final UserSubscriptionRepository subs;
    private final PlanRepository plans;

    @Transactional(readOnly = true)
    public AdminAnalyticsSummaryDTO summary(int trendDays) {
        int days = trendDays > 0 ? trendDays : 30;

        List<NamedCount> planDist = subs.planDistribution().stream()
                .map(r -> new NamedCount(r.getLabel(), r.getCnt()))
                .toList();
        List<NamedCount> statuses = subs.statusBreakdown().stream()
                .map(r -> new NamedCount(r.getLabel(), r.getCnt()))
                .toList();
        List<DayCount> trend = subs.signupsTrend(days).stream()
                .map(r -> new DayCount(r.getDay(), r.getCnt()))
                .toList();

        return new AdminAnalyticsSummaryDTO(
                subs.countDistinctUsers(),
                subs.countActive(),
                subs.countCanceledWithinDays(30),
                (int) plans.count(),
                planDist,
                statuses,
                trend
        );
    }
}
