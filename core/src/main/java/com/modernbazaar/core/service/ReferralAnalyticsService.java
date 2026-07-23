package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.ReferralClick;
import com.modernbazaar.core.domain.ReferralPayout;
import com.modernbazaar.core.dto.AdminReferralOverviewDTO;
import com.modernbazaar.core.dto.ReferralPayoutDTO;
import com.modernbazaar.core.repository.*;
import com.modernbazaar.core.repository.projection.ReferralUserStatRow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${referral.rev-share-pct:30}")
    private int revSharePct;

    @Value("${referral.plan-monthly-cents.flipper:599}")
    private long flipperMonthlyCents;

    @Value("${referral.plan-monthly-cents.elite:2599}")
    private long eliteMonthlyCents;

    private long monthlyCents(String slug) {
        if (slug == null) return 0;
        return switch (slug.toLowerCase()) {
            case "flipper" -> flipperMonthlyCents;
            case "elite" -> eliteMonthlyCents;
            default -> 0;
        };
    }

    /** Records a referral-link click. Best-effort; unknown codes are ignored (no error to the visitor). */
    @Transactional
    public void recordClick(String code) {
        if (code == null || code.isBlank()) return;
        String norm = code.trim().toUpperCase();
        if (!codeRepo.existsByCodeIgnoreCase(norm)) {
            log.debug("Referral click for unknown code {} - ignoring", norm);
            return;
        }
        clickRepo.save(ReferralClick.builder().code(norm).build());
    }

    @Transactional(readOnly = true)
    public List<AdminReferralOverviewDTO> overview() {
        var codes = codeRepo.findAll();

        // clicks per code
        Map<String, Long> clicks = new HashMap<>();
        clickRepo.clickCountsByCode().forEach(r -> clicks.put(r.getLabel(), r.getCnt()));

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

        Instant now = Instant.now();
        Instant sevenDaysAgo = now.minusSeconds(7 * 24 * 3600);

        List<AdminReferralOverviewDTO> out = new ArrayList<>();
        for (var c : codes) {
            List<ReferralUserStatRow> rows = byCode.getOrDefault(c.getCode(), List.of());
            int subscribers = rows.size();
            int active = 0, activeRecent = 0;
            long revenueCents = 0;
            Map<String, Integer> activeByPlan = new TreeMap<>();
            Instant lastActivity = null;

            for (ReferralUserStatRow r : rows) {
                boolean entitled = isEntitled(r.getStatus(), r.getPeriodEnd(), now);
                if (entitled) {
                    active++;
                    revenueCents += monthlyCents(r.getPlan());
                    if (r.getPlan() != null) activeByPlan.merge(r.getPlan(), 1, Integer::sum);
                    if (r.getLastSeen() != null && r.getLastSeen().isAfter(sevenDaysAgo)) activeRecent++;
                }
                if (r.getLastSeen() != null && (lastActivity == null || r.getLastSeen().isAfter(lastActivity))) {
                    lastActivity = r.getLastSeen();
                }
            }

            long codeClicks = clicks.getOrDefault(c.getCode(), 0L);
            Double convRate = codeClicks > 0 ? (subscribers * 100.0 / codeClicks) : null;
            long owed = Math.round(revenueCents * (revSharePct / 100.0));

            out.add(new AdminReferralOverviewDTO(
                    c.getId(), c.getCode(), c.getUserId(), c.getCreatedAt(),
                    codeClicks, subscribers, active, activeRecent, activeByPlan,
                    convRate, revenueCents, owed,
                    pendingByCode.getOrDefault(c.getCode(), 0L),
                    paidByCode.getOrDefault(c.getCode(), 0L),
                    lastActivity));
        }

        // Most valuable creators first (by owed, then subscribers, then clicks).
        out.sort(Comparator
                .comparingLong(AdminReferralOverviewDTO::estMonthlyOwedCents).reversed()
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
        ReferralPayout p = ReferralPayout.builder()
                .code(code.trim().toUpperCase())
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
        p.setStatus("paid");
        p.setPaidAt(OffsetDateTime.now());
        return ReferralPayoutDTO.of(payoutRepo.save(p));
    }

    @Transactional
    public void deletePayout(Long id) {
        payoutRepo.deleteById(id);
    }
}
