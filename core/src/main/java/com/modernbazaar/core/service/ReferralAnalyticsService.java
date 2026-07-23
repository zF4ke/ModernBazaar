package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.ReferralClick;
import com.modernbazaar.core.domain.ReferralPayout;
import com.modernbazaar.core.domain.ReferralSignup;
import com.modernbazaar.core.dto.AdminReferralOverviewDTO;
import com.modernbazaar.core.dto.ReferralPayoutDTO;
import com.modernbazaar.core.repository.*;
import com.modernbazaar.core.repository.projection.ReferralUserStatRow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * The affiliate cockpit's read model and payout ledger. Turns raw clicks,
 * conversions, subscription state and payouts into a per-creator overview
 * (reach, conversion, retention, revenue, owed) and records payouts.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReferralAnalyticsService {

    private final ReferralCodeRepository codeRepo;
    private final ReferralConversionRepository conversionRepo;
    private final ReferralClickRepository clickRepo;
    private final ReferralPayoutRepository payoutRepo;
    private final ReferralSignupRepository signupRepo;

    private final ReferralEarningRepository earningRepo;

    /** Records a referral-link click. Best-effort; unknown codes are ignored (no error to the visitor). */
    @Transactional
    public void recordClick(String code, String visitorKey) {
        if (code == null || code.isBlank() || visitorKey == null || visitorKey.isBlank()) return;
        String norm = code.trim().toUpperCase();
        String visitor = visitorKey.trim();
        if (!visitor.matches("[A-Za-z0-9_-]{16,64}")) return;
        if (!codeRepo.existsByCodeIgnoreCase(norm)) {
            log.debug("Referral click for unknown code {} - ignoring", norm);
            return;
        }
        clickRepo.insertDeduplicated(norm, visitor);
    }

    /**
     * Attributes a free-account signup to a referral code (the mb_ref cookie was
     * present at first provisioning). Idempotent per user — the first code keeps
     * the attribution; self-signups on the creator's own code are ignored.
     * Best-effort: must never fail the setup call that carried it.
     */
    @Transactional
    public void recordSignup(String code, String userId) {
        if (code == null || code.isBlank() || userId == null || userId.isBlank()) return;
        String norm = code.trim().toUpperCase();
        var codeRow = codeRepo.findByCodeIgnoreCase(norm).orElse(null);
        if (codeRow == null) {
            log.debug("Referral signup for unknown code {} - ignoring", norm);
            return;
        }
        if (userId.equals(codeRow.getUserId())) return; // creator's own account
        if (signupRepo.existsByUserId(userId)) return;
        signupRepo.save(ReferralSignup.builder().code(codeRow.getCode()).userId(userId).build());
        log.info("Referral signup recorded for code={}", codeRow.getCode());
    }

    @Transactional(readOnly = true)
    public List<AdminReferralOverviewDTO> overview() {
        var codes = codeRepo.findAll();

        // clicks per code
        Map<String, Long> clicks = new HashMap<>();
        clickRepo.clickCountsByCode().forEach(r -> clicks.put(r.getLabel(), r.getCnt()));

        // attributed free-account signups per code (the funnel's middle step)
        Map<String, Long> signups = new HashMap<>();
        signupRepo.signupCountsByCode().forEach(r -> signups.put(r.getLabel(), r.getCnt()));

        // referred users' latest subscription state, grouped by code
        Map<String, List<ReferralUserStatRow>> byCode = new HashMap<>();
        for (ReferralUserStatRow row : conversionRepo.referredUserStats()) {
            byCode.computeIfAbsent(row.getCode(), k -> new ArrayList<>()).add(row);
        }

        // payouts grouped by code
        Map<String, Long> pendingByCode = new HashMap<>();
        Map<String, Long> paidByCode = new HashMap<>();
        for (ReferralPayout p : payoutRepo.findAll()) {
            if ("paid".equalsIgnoreCase(p.getStatus())) {
                paidByCode.merge(p.getCode(), p.getAmountCents(), Long::sum);
            } else {
                pendingByCode.merge(p.getCode(), p.getAmountCents(), Long::sum);
            }
        }

        Map<String, Long> collectedByCode = new HashMap<>();
        Map<String, Long> eligibleCommissionByCode = new HashMap<>();
        OffsetDateTime nowOffset = OffsetDateTime.now();
        for (var earning : earningRepo.findAll()) {
            long collected = Math.max(0, earning.getNetRevenueCents() - earning.getRefundedCents());
            collectedByCode.merge(earning.getCode(), collected, Long::sum);
            if (!earning.getEligibleAt().isAfter(nowOffset)) {
                eligibleCommissionByCode.merge(earning.getCode(), earning.getCommissionCents(), Long::sum);
            }
        }

        Instant now = Instant.now();
        Instant sevenDaysAgo = now.minusSeconds(7 * 24 * 3600);

        List<AdminReferralOverviewDTO> out = new ArrayList<>();
        for (var c : codes) {
            List<ReferralUserStatRow> rows = byCode.getOrDefault(c.getCode(), List.of());
            int subscribers = rows.size();
            int active = 0, activeRecent = 0;
            Map<String, Integer> activeByPlan = new TreeMap<>();
            Instant lastActivity = null;

            for (ReferralUserStatRow r : rows) {
                boolean entitled = isEntitled(r.getStatus(), r.getPeriodEnd(), now);
                if (entitled) {
                    active++;
                    if (r.getPlan() != null) activeByPlan.merge(r.getPlan(), 1, Integer::sum);
                    if (r.getLastSeen() != null && r.getLastSeen().isAfter(sevenDaysAgo)) activeRecent++;
                }
                if (r.getLastSeen() != null && (lastActivity == null || r.getLastSeen().isAfter(lastActivity))) {
                    lastActivity = r.getLastSeen();
                }
            }

            long codeClicks = clicks.getOrDefault(c.getCode(), 0L);
            Double convRate = codeClicks > 0 ? (subscribers * 100.0 / codeClicks) : null;
            long alreadyRecorded = pendingByCode.getOrDefault(c.getCode(), 0L)
                    + paidByCode.getOrDefault(c.getCode(), 0L);
            long owed = Math.max(0, eligibleCommissionByCode.getOrDefault(c.getCode(), 0L) - alreadyRecorded);

            out.add(new AdminReferralOverviewDTO(
                    c.getId(), c.getCode(), c.getUserId(), c.getCreatedAt(),
                    codeClicks, signups.getOrDefault(c.getCode(), 0L),
                    subscribers, active, activeRecent, activeByPlan,
                    convRate, collectedByCode.getOrDefault(c.getCode(), 0L), owed,
                    pendingByCode.getOrDefault(c.getCode(), 0L),
                    paidByCode.getOrDefault(c.getCode(), 0L),
                    lastActivity));
        }

        // Most valuable creators first (by owed, then subscribers, then clicks).
        out.sort(Comparator
                .comparingLong(AdminReferralOverviewDTO::eligibleOwedCents).reversed()
                .thenComparing(Comparator.comparingInt(AdminReferralOverviewDTO::subscribers).reversed())
                .thenComparing(Comparator.comparingLong(AdminReferralOverviewDTO::clicks).reversed()));
        return out;
    }

    private static boolean isEntitled(String status, Instant periodEnd, Instant now) {
        if (status == null) return false;
        if ("active".equalsIgnoreCase(status)) return true;
        // A canceled sub still counts while inside the paid period.
        return "canceled".equalsIgnoreCase(status) && periodEnd != null && periodEnd.isAfter(now);
    }

    /* ─────────────────────────── payouts ─────────────────────────── */

    @Transactional(readOnly = true)
    public List<ReferralPayoutDTO> listPayouts() {
        return payoutRepo.findAllByOrderByCreatedAtDesc().stream().map(ReferralPayoutDTO::of).toList();
    }

    @Transactional
    public ReferralPayoutDTO createPayout(String code, long amountCents, LocalDate periodStart, LocalDate periodEnd, String note) {
        if (code == null || code.isBlank()) throw new IllegalArgumentException("code is required");
        if (amountCents <= 0) throw new IllegalArgumentException("amount must be positive");
        String normalizedCode = code.trim().toUpperCase();
        if (!codeRepo.existsByCodeIgnoreCase(normalizedCode)) throw new IllegalArgumentException("referral code not found");
        if (periodStart == null || periodEnd == null || periodStart.isAfter(periodEnd)) {
            throw new IllegalArgumentException("a valid payout period is required");
        }
        if (payoutRepo.existsByCodeAndPeriodStartAndPeriodEnd(normalizedCode, periodStart, periodEnd)) {
            throw new IllegalArgumentException("a payout already exists for this code and period");
        }
        long eligible = eligibleOutstanding(normalizedCode);
        if (amountCents > eligible) {
            throw new IllegalArgumentException("amount exceeds eligible unpaid commission");
        }
        ReferralPayout p = ReferralPayout.builder()
                .code(normalizedCode)
                .amountCents(amountCents)
                .periodStart(periodStart)
                .periodEnd(periodEnd)
                .note(note)
                .status("pending")
                .build();
        return ReferralPayoutDTO.of(payoutRepo.save(p));
    }

    @Transactional
    public ReferralPayoutDTO markPaid(Long id) {
        ReferralPayout p = payoutRepo.findById(id).orElseThrow(() -> new IllegalArgumentException("payout not found: " + id));
        if ("paid".equalsIgnoreCase(p.getStatus())) return ReferralPayoutDTO.of(p);
        p.setStatus("paid");
        p.setPaidAt(OffsetDateTime.now());
        return ReferralPayoutDTO.of(payoutRepo.save(p));
    }

    @Transactional
    public void deletePayout(Long id) {
        ReferralPayout payout = payoutRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("payout not found: " + id));
        if ("paid".equalsIgnoreCase(payout.getStatus())) {
            throw new IllegalStateException("paid payouts are immutable");
        }
        payoutRepo.delete(payout);
    }

    private long eligibleOutstanding(String code) {
        OffsetDateTime now = OffsetDateTime.now();
        long eligible = earningRepo.findAllByCode(code).stream()
                .filter(e -> !e.getEligibleAt().isAfter(now))
                .mapToLong(com.modernbazaar.core.domain.ReferralEarning::getCommissionCents)
                .sum();
        long recorded = payoutRepo.findByCodeOrderByCreatedAtDesc(code).stream()
                .mapToLong(ReferralPayout::getAmountCents)
                .sum();
        return Math.max(0, eligible - recorded);
    }
}
