package com.modernbazaar.core.api;

import com.modernbazaar.core.service.ReferralAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Public click-tracking endpoint hit by the dashboard's /r/{code} redirect
 * route. Anonymous by design (the visitor isn't logged in yet); unknown codes
 * are silently ignored so the endpoint leaks nothing about which codes exist.
 */
@RestController
@RequestMapping(path = "/api/v1/referral", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Referral")
public class ReferralClickController {

    private final ReferralAnalyticsService analytics;

    @PostMapping(path = "/click", consumes = MediaType.APPLICATION_JSON_VALUE)
    @RateLimiter(name = "referralClick")
    @Operation(summary = "Record a referral link click (anonymous, fire-and-forget)")
    public Map<String, Boolean> click(@RequestBody ClickRequest body) {
        analytics.recordClick(body.code(), body.visitorKey());
        return Map.of("ok", true);
    }

    public record ClickRequest(String code, String visitorKey) {}
}
