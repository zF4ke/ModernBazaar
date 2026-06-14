package com.modernbazaar.core.config;

import com.modernbazaar.core.service.AppSettingsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Emergency kill switch. When maintenance mode is on, every API request returns
 * 503 EXCEPT the exempt paths below, so the site is effectively down for users
 * while admins can still operate and flip it back off.
 *
 * Exempt: admin APIs (only admins can reach them; that's how you turn it back
 * off), actuator (health/metrics), the public status endpoint, and OPTIONS
 * preflight. The path check is enough — no auth inspection needed.
 */
@Component
@Order(1)
@RequiredArgsConstructor
public class MaintenanceFilter extends OncePerRequestFilter {

    private final AppSettingsService settings;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        if (settings.isMaintenanceMode() && !isExempt(req)) {
            res.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE); // 503
            res.setContentType("application/json");
            res.setHeader("Retry-After", "120");
            res.getWriter().write("{\"maintenance\":true,\"error\":\"Modern Bazaar is temporarily down for maintenance. Back shortly.\"}");
            return;
        }
        chain.doFilter(req, res);
    }

    private boolean isExempt(HttpServletRequest req) {
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) return true;
        String p = req.getRequestURI();
        return p.startsWith("/api/admin/")
                || p.startsWith("/actuator/")
                || p.equals("/api/status");
    }
}
