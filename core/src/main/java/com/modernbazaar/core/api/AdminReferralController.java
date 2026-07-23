package com.modernbazaar.core.api;

import com.modernbazaar.core.dto.AdminReferralOverviewDTO;
import com.modernbazaar.core.dto.ReferralCodeDTO;
import com.modernbazaar.core.dto.ReferralPayoutDTO;
import com.modernbazaar.core.service.ReferralAnalyticsService;
import com.modernbazaar.core.service.ReferralService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Referral-code administration is gated by {@code manage:plans}; financial
 * overview and payout routes additionally require {@code manage:billing}.
 */
@RestController
@RequestMapping(path = "/api/admin/referrals", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Admin Referrals")
public class AdminReferralController {

    private final ReferralService referrals;
    private final ReferralAnalyticsService analytics;

    @GetMapping
    @Operation(summary = "List referral codes, most conversions first")
    public List<ReferralCodeDTO> list() {
        return referrals.list();
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Get or create a referral code for a user (optional custom code)")
    public ReferralCodeDTO create(@RequestBody CreateRequest body) {
        return referrals.getOrCreate(body.userId(), body.code());
    }

    @DeleteMapping(path = "/{id}")
    @Operation(summary = "Delete a referral code")
    public java.util.Map<String, Boolean> delete(@PathVariable Long id) {
        referrals.delete(id);
        return java.util.Map.of("deleted", true);
    }

    public record CreateRequest(String userId, String code) {}

    /* ─────────────────────── creator cockpit ─────────────────────── */

    @GetMapping(path = "/overview")
    @Operation(summary = "Per-creator instrumentation: clicks, CTR, subscribers, plan mix, usage, revenue and owed")
    public List<AdminReferralOverviewDTO> overview() {
        return analytics.overview();
    }

    @GetMapping(path = "/payouts")
    @Operation(summary = "Payout ledger, newest first (pending + paid)")
    public List<ReferralPayoutDTO> payouts() {
        return analytics.listPayouts();
    }

    @PostMapping(path = "/payouts", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Record a pending payout for a creator (amount in cents, optional period)")
    public ReferralPayoutDTO createPayout(@RequestBody PayoutRequest body) {
        return analytics.createPayout(body.code(), body.amountCents(), body.periodStart(), body.periodEnd(), body.note());
    }

    @PostMapping(path = "/payouts/{id}/paid")
    @Operation(summary = "Mark a payout as paid (stamps paidAt)")
    public ReferralPayoutDTO markPaid(@PathVariable Long id) {
        return analytics.markPaid(id);
    }

    @DeleteMapping(path = "/payouts/{id}")
    @Operation(summary = "Delete a payout entry (e.g. recorded by mistake)")
    public java.util.Map<String, Boolean> deletePayout(@PathVariable Long id) {
        analytics.deletePayout(id);
        return java.util.Map.of("deleted", true);
    }

    public record PayoutRequest(String code, long amountCents, LocalDate periodStart, LocalDate periodEnd, String note) {}
}
