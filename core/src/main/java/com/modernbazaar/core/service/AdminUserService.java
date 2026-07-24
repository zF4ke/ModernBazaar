package com.modernbazaar.core.service;

import com.modernbazaar.core.api.dto.AdminUserDTO;
import com.modernbazaar.core.api.dto.PagedResponseDTO;
import com.modernbazaar.core.domain.UserSubscription;
import com.modernbazaar.core.repository.PlanRepository;
import com.modernbazaar.core.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserSubscriptionRepository subs;
    private final PlanRepository plans;
    private final Auth0ManagementService auth0;

    @Transactional(readOnly = true)
    public PagedResponseDTO<AdminUserDTO> list(int page, int limit, String q, String sortBy, String dir) {
        if (limit <= 0) limit = 25;
        if (page < 0) page = 0;
        // Whitelist sortable columns; default to user id (stable, requested default).
        String field = switch (sortBy == null ? "" : sortBy) {
            case "planSlug", "status", "currentPeriodEnd", "createdAt", "email", "name" -> sortBy;
            default -> "userId";
        };
        var direction = "desc".equalsIgnoreCase(dir) ? Sort.Direction.DESC : Sort.Direction.ASC;
        var pageable = PageRequest.of(page, limit, Sort.by(direction, field));
        Page<UserSubscription> p = (q == null || q.isBlank())
                ? subs.findAll(pageable)
                : subs.search(q.trim(), pageable);
        return PagedResponseDTO.fromPage(p.map(AdminUserDTO::of));
    }

    /** Admin override of a user's plan (no payment). */
    @Transactional
    public AdminUserDTO setPlan(String userId, String planSlug) {
        return setPlan(userId, planSlug, null);
    }

    /**
     * Admin plan override. With {@code days} set (a comp — e.g. a creator's free
     * month of Elite), the grant is written as status "canceled" with a period end
     * {@code days} from now: the entitlement rule (canceled + future period end =
     * entitled) honors it until then and it EXPIRES BY ITSELF — no forever-comps,
     * no cleanup job. Without {@code days}, the grant is permanent (status active),
     * as before.
     */
    public AdminUserDTO setPlan(String userId, String planSlug, Integer days) {
        var plan = plans.findBySlug(planSlug)
                .orElseThrow(() -> new NoSuchElementException("Unknown plan: " + planSlug));
        if (days != null && (days < 1 || days > MAX_EXTEND_DAYS)) {
            throw new IllegalArgumentException("days must be between 1 and " + MAX_EXTEND_DAYS);
        }
        var sub = subs.findFirstByUserIdOrderByIdDesc(userId)
                .orElse(UserSubscription.builder().userId(userId).status("active").build());
        sub.setPlanSlug(plan.getSlug());
        if (days != null && !"free".equalsIgnoreCase(plan.getSlug())) {
            sub.setStatus("canceled"); // comp: entitled until period end, then auto-expires
            sub.setCurrentPeriodEnd(OffsetDateTime.now().plusDays(days));
        } else if (sub.getStatus() == null) {
            sub.setStatus("active");
        }
        var saved = subs.save(sub);
        // Sync Auth0 roles so access actually changes (grant on upgrade, revoke on
        // downgrade to free). Takes effect on the user's next token refresh / login.
        auth0.syncPlanRoles(userId, plan.getSlug());
        return AdminUserDTO.of(saved);
    }

    /**
     * Removes a user from our system: revokes their paid Auth0 roles (down to Free)
     * and deletes their subscription record. The Auth0 account itself is not deleted,
     * so if they log in again they're re-provisioned on the free plan.
     */
    @Transactional
    public void delete(String userId) {
        auth0.syncPlanRoles(userId, "free"); // revoke paid scopes
        subs.deleteByUserId(userId);
    }

    /** Maximum manual grant in one call (10 years) — guards against fat-finger / abuse. */
    private static final int MAX_EXTEND_DAYS = 3650;

    /** Extend the current period by N days (comp time / manual grant). */
    @Transactional
    public AdminUserDTO extend(String userId, int days) {
        // Reject non-positive (would move the period backward / expire a paying user)
        // and absurdly large values.
        if (days < 1 || days > MAX_EXTEND_DAYS) {
            throw new IllegalArgumentException("days must be between 1 and " + MAX_EXTEND_DAYS);
        }
        var sub = subs.findFirstByUserIdOrderByIdDesc(userId)
                .orElseThrow(() -> new NoSuchElementException("No subscription for " + userId));
        var now = OffsetDateTime.now();
        var base = (sub.getCurrentPeriodEnd() != null && sub.getCurrentPeriodEnd().isAfter(now))
                ? sub.getCurrentPeriodEnd() : now;
        sub.setCurrentPeriodEnd(base.plusDays(days));
        sub.setStatus("active");
        return AdminUserDTO.of(subs.save(sub));
    }
}
