package com.modernbazaar.core.dto;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Map;

/**
 * One creator's referral code, fully instrumented: reach (clicks), conversion
 * (subscribers), retention (active + recently-seen), collected referral
 * revenue, eligible unpaid commission, and payout state.
 */
public record AdminReferralOverviewDTO(
        Long id,
        String code,
        String ownerUserId,
        OffsetDateTime createdAt,
        long clicks,
        long signups,              // attributed free-account signups (funnel middle step)
        int subscribers,           // referred users who ever converted (first paid)
        int activeSubscribers,     // of those, currently entitled (active, or canceled within period)
        int activeLast7Days,       // active subscribers seen in the last 7 days
        Map<String, Integer> activeByPlan,
        Double conversionRatePct,  // subscribers / clicks * 100, null if no clicks yet
        long collectedRevenueCents,
        long eligibleOwedCents,
        long pendingPayoutCents,   // sum of recorded payouts still marked pending
        long paidToDateCents,      // sum of recorded payouts marked paid
        Instant lastReferredActivity
) {}
