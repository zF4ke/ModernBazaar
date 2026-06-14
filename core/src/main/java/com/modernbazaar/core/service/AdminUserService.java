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

    @Transactional(readOnly = true)
    public PagedResponseDTO<AdminUserDTO> list(int page, int limit, String q) {
        if (limit <= 0) limit = 25;
        if (page < 0) page = 0;
        var pageable = PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<UserSubscription> p = (q == null || q.isBlank())
                ? subs.findAll(pageable)
                : subs.findByUserIdContainingIgnoreCase(q.trim(), pageable);
        return PagedResponseDTO.fromPage(p.map(AdminUserDTO::of));
    }

    /** Admin override of a user's plan (no payment). */
    @Transactional
    public AdminUserDTO setPlan(String userId, String planSlug) {
        var plan = plans.findBySlug(planSlug)
                .orElseThrow(() -> new NoSuchElementException("Unknown plan: " + planSlug));
        var sub = subs.findFirstByUserIdOrderByIdDesc(userId)
                .orElse(UserSubscription.builder().userId(userId).status("active").build());
        sub.setPlanSlug(plan.getSlug());
        if (sub.getStatus() == null) sub.setStatus("active");
        return AdminUserDTO.of(subs.save(sub));
    }

    /** Extend the current period by N days (comp time / manual grant). */
    @Transactional
    public AdminUserDTO extend(String userId, int days) {
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
