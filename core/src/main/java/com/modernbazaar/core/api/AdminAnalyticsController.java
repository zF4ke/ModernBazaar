package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.AdminAnalyticsSummaryDTO;
import com.modernbazaar.core.service.AdminAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

/**
 * Admin-only growth/usage analytics. Gated by the {@code manage:plans} scope via
 * SecurityConfig's {@code /api/admin/**} rule.
 */
@RestController
@RequestMapping(path = "/api/admin/analytics", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Admin Analytics")
public class AdminAnalyticsController {

    private final AdminAnalyticsService analytics;

    @GetMapping("/summary")
    @Operation(summary = "Growth & usage snapshot (users, subscriptions, plan mix, signups trend)")
    public AdminAnalyticsSummaryDTO summary(@RequestParam(name = "trendDays", defaultValue = "30") int trendDays) {
        return analytics.summary(trendDays);
    }
}
