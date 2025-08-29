package com.modernbazaar.core.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.modernbazaar.core.config.SecurityConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.core.AuthenticationException;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.*;

/**
 * Unified Spring Security exception handler.
 *
 * Provides consistent JSON responses for both unauthenticated (401) and
 * forbidden (403) cases with permission context, so the frontend can show
 * actionable messages.
 *
 * Fields:
 * - requiredPermissions: double-list semantics for requirements.
 *   Each entry is a group that MUST be satisfied (AND between groups),
 *   while items within a group are alternatives (OR within group).
 *   Examples:
 *     [["SCOPE_manage:plans"]]
 *     [["SCOPE_use:starter","SCOPE_use:flipper","SCOPE_use:elite"]]
 *     [["SCOPE_read:plans"], ["SCOPE_use:starter","SCOPE_use:flipper"]]
 * - requiredPermission: human-readable label derived from requiredPermissions
 *   (e.g., "A OR B", or "(A OR B) AND (C)")
 * - currentPermissions: authorities extracted from the JWT (403 only)
 * - missingPermissions: same double-list semantics, but only includes groups
 *   that are not satisfied by currentPermissions.
 */
@RequiredArgsConstructor
@Slf4j
public class ApiSecurityExceptionHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final SecurityConfig securityConfig;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Handles unauthenticated access (HTTP 401).
     *
     * Triggered when no token is present or the token is invalid/expired,
     * before the request reaches any controller. Returns a JSON body
     * describing the required permission for the endpoint and marks all
     * permissions as missing since the user is unauthenticated.
     */
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException, ServletException {
        String endpoint = request.getRequestURI();
        List<String> required = securityConfig.getRequiredPermissionForEndpoint(endpoint);

        Map<String, Object> body = baseBody(401, "Authentication failed", "Invalid or missing JWT token. Please login.", endpoint);
        if (required != null && !required.isEmpty()) {
            Object requiredOut = (required.size() == 1)
                    ? List.of(required.get(0))
                    : List.of(required);
            body.put("requiredPermissions", requiredOut);
            String label = required.size() == 1 ? required.get(0) : String.join(" OR ", required);
            body.put("requiredPermission", label);
        }
        body.put("currentPermissions", Collections.emptyList());
        Object missing;
        if (required != null && !required.isEmpty()) {
            if (required.size() == 1) {
                missing = List.of(required.get(0));
            } else {
                // Double-list syntax: a list inside the array denotes an OR group
                missing = List.of(required);
            }
        } else {
            missing = Collections.emptyList();
        }
        body.put("missingPermissions", missing);

        String reqLabel = (required == null || required.isEmpty()) ? "none" : (required.size() == 1 ? required.get(0) : String.join(" OR ", required));
        log.warn("Unauthenticated access: endpoint={}, requiredPermission={}", endpoint, reqLabel);
        write(response, 401, body);
    }

    /**
     * Handles access denied (HTTP 403).
     *
     * Triggered when the user is authenticated but lacks the required
     * authority for the endpoint. Returns a JSON body with the required
     * permission, the user's current permissions, and a best‑effort list
     * of missing permissions.
     */
    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException) throws IOException, ServletException {
        String endpoint = request.getRequestURI();
        List<String> required = securityConfig.getRequiredPermissionForEndpoint(endpoint);

        // Extract current permissions from authentication
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        List<String> currentPermissions = new ArrayList<>();
        if (auth != null && auth.getAuthorities() != null) {
            for (GrantedAuthority ga : auth.getAuthorities()) {
                currentPermissions.add(ga.getAuthority());
            }
        }

        // Compute missing permissions with double-list OR group syntax
        Object missingPermissions;
        if (required != null && !required.isEmpty()) {
            if (required.size() == 1) {
                String only = required.get(0);
                missingPermissions = currentPermissions.contains(only) ? Collections.emptyList() : List.of(only);
            } else {
                boolean hasAny = currentPermissions.stream().anyMatch(required::contains);
                missingPermissions = hasAny ? Collections.emptyList() : List.of(required);
            }
        } else {
            missingPermissions = Collections.emptyList();
        }

        Map<String, Object> body = baseBody(403, "Access denied", "You do not have permission to access this resource.", endpoint);
        if (required != null && !required.isEmpty()) {
            Object requiredOut = (required.size() == 1)
                    ? List.of(required.get(0))
                    : List.of(required);
            body.put("requiredPermissions", requiredOut);
            String label = required.size() == 1 ? required.get(0) : String.join(" OR ", required);
            body.put("requiredPermission", label);
        }
        body.put("currentPermissions", currentPermissions);
        body.put("missingPermissions", missingPermissions);

        String reqLabel403 = (required == null || required.isEmpty()) ? "none" : (required.size() == 1 ? required.get(0) : String.join(" OR ", required));
        log.warn("Access denied: endpoint={}, requiredPermission={}, currentPermissions={}", endpoint, reqLabel403, currentPermissions);
        write(response, 403, body);
    }

    /**
     * Builds the common response structure.
     *
     * @param status HTTP status code (401 or 403)
     * @param error short error summary
     * @param details human‑readable details
     * @param endpoint request path
     * @return ordered map suitable for JSON serialization
     */
    private Map<String, Object> baseBody(int status, String error, String details, String endpoint) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status);
        body.put("error", error);
        body.put("details", details);
        body.put("endpoint", endpoint);
        return body;
    }

    /**
     * Writes the JSON response using the given status and body.
     */
    private void write(HttpServletResponse response, int status, Map<String, Object> body) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
