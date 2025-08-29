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
 * actionable messages. It includes:
 * - requiredPermission: permission needed for the endpoint
 * - currentPermissions: permissions extracted from the JWT (403 only)
 * - missingPermissions: best‑effort list of what is missing
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
        String requiredPermission = securityConfig.getRequiredPermissionForEndpoint(endpoint);

        Map<String, Object> body = baseBody(401, "Authentication failed", "Invalid or missing JWT token. Please login.", endpoint);
        body.put("requiredPermission", requiredPermission);
        body.put("currentPermissions", Collections.emptyList());
        body.put("missingPermissions", requiredPermission != null && !requiredPermission.equals("none") ? List.of(requiredPermission) : Collections.emptyList());

        log.warn("Unauthenticated access: endpoint={}, requiredPermission={}", endpoint, requiredPermission);
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
        String requiredPermission = securityConfig.getRequiredPermissionForEndpoint(endpoint);

        // Extract current permissions from authentication
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        List<String> currentPermissions = new ArrayList<>();
        if (auth != null && auth.getAuthorities() != null) {
            for (GrantedAuthority ga : auth.getAuthorities()) {
                currentPermissions.add(ga.getAuthority());
            }
        }

        // Compute missing permissions (simple case: single required)
        List<String> missingPermissions = new ArrayList<>();
        if (requiredPermission != null && !requiredPermission.equals("unknown") && !requiredPermission.equals("none") && !requiredPermission.contains(",")) {
            if (!currentPermissions.contains(requiredPermission)) {
                missingPermissions.add(requiredPermission);
            }
        }

        Map<String, Object> body = baseBody(403, "Access denied", "You do not have permission to access this resource.", endpoint);
        body.put("requiredPermission", requiredPermission);
        body.put("currentPermissions", currentPermissions);
        body.put("missingPermissions", missingPermissions);

        log.warn("Access denied: endpoint={}, requiredPermission={}, currentPermissions={}", endpoint, requiredPermission, currentPermissions);
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
