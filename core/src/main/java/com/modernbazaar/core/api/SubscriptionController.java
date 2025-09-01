package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.SubscriptionResponseDTO;
import com.modernbazaar.core.api.dto.UserPermissionsDTO;
import com.modernbazaar.core.repository.PlanRepository;
import com.modernbazaar.core.service.SubscriptionService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.LinkedHashSet;

/**
 * REST controller for managing user subscriptions and subscription plans.
 *
 * This controller provides endpoints for:
 * - Retrieving user's current subscription details
 * - Listing available subscription plans
 *
 * Security is handled at the endpoint level through Spring Security configuration.
 * The plans endpoint is public, while subscription details require authentication.
 */
@RestController
@RequestMapping(path = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Slf4j
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final PlanRepository planRepository;

    /**
     * Retrieves the current user's subscription information.
     *
     * This endpoint:
     * - Requires authentication (JWT token)
     * - Automatically creates a free plan if no subscription exists
     * - Returns subscription details with associated plan information
     * - Is rate-limited to prevent abuse
     *
     * @param jwt The authenticated user's JWT token
     * @return SubscriptionResponseDTO containing user's subscription details
     * @throws Exception if subscription retrieval fails
     */
    @GetMapping("/me/subscription")
    @RateLimiter(name = "subscriptionEndpoint")
    public SubscriptionResponseDTO mySubscription(@AuthenticationPrincipal Jwt jwt) {
        try {
            String userId = jwt.getSubject();
            log.debug("Fetching subscription for user: {}", userId);
            
            var subscription = subscriptionService.ensureFreePlan(userId);
            var plan = planRepository.findBySlug(subscription.getPlanSlug()).orElse(null);
            
            log.debug("Successfully retrieved subscription for user: {}", userId);
            return SubscriptionResponseDTO.from(subscription, plan);
        } catch (Exception e) {
            log.error("Error fetching subscription for user: {}", jwt.getSubject(), e);
            throw e;
        }
    }

    /**
     * Retrieves all active subscription plans available to users.
     *
     * This endpoint:
     * - Is publicly accessible (no authentication required)
     * - Returns only active plans
     * - Is rate-limited to prevent abuse
     * - Handles errors gracefully by returning an empty list
     *
     * @return List of active subscription plans
     */
    @GetMapping("/plans")
    @RateLimiter(name = "subscriptionEndpoint")
    public List<SubscriptionResponseDTO.PlanDTO> activePlans() {
        try {
            log.debug("Fetching active subscription plans");
            
            var allPlans = planRepository.findAll();
            var activePlans = allPlans.stream()
                    .filter(plan -> plan.isActive())
                    .map(SubscriptionResponseDTO.PlanDTO::from)
                    .toList();
            
            log.debug("Successfully retrieved {} active plans", activePlans.size());
            return activePlans;
        } catch (Exception e) {
            log.error("Error fetching active plans", e);
            return List.of();
        }
    }

    /**
     * Retrieves the current user's permissions based on their Auth0 JWT claims.
     *
     * This endpoint:
     * - Requires authentication (JWT token)
     * - Returns permissions from the JWT token's scope/permissions claims
     * - Is rate-limited to prevent abuse
     *
     * @param jwt The authenticated user's JWT token
     * @return UserPermissionsDTO containing user's permissions
     * @throws Exception if permissions retrieval fails
     */
    @GetMapping("/me/permissions")
    @RateLimiter(name = "subscriptionEndpoint")
    public UserPermissionsDTO myPermissions(@AuthenticationPrincipal Jwt jwt) {
        try {
            String userId = jwt.getSubject();
            log.debug("Fetching permissions for user: {}", userId);
            
            // Extract permissions from JWT claims
            List<String> permissions = extractPermissionsFromJwt(jwt);
            
            // Get subscription info for tier and expiry
            var subscription = subscriptionService.ensureFreePlan(userId);
            var plan = planRepository.findBySlug(subscription.getPlanSlug()).orElse(null);
            
            String subscriptionTier = plan != null ? plan.getSlug() : "free";
            
            log.debug("Successfully retrieved permissions for user: {} - {} permissions, tier: {}", 
                     userId, permissions.size(), subscriptionTier);
            
            return UserPermissionsDTO.builder()
                .permissions(permissions)
                .subscriptionTier(subscriptionTier)
                .expiresAt(subscription.getCurrentPeriodEnd())
                .build();
                
        } catch (Exception e) {
            log.error("Error fetching permissions for user: {}", jwt.getSubject(), e);
            throw e;
        }
    }

    /**
     * Extracts permissions from JWT claims (scope, scp, permissions)
     */
    private List<String> extractPermissionsFromJwt(Jwt jwt) {
        Set<String> permissions = new LinkedHashSet<>();
        
        try {
            // Check scope claim (traditional OAuth2)
            Object scopeClaim = jwt.getClaims().get("scope");
            if (scopeClaim instanceof String s) {
                permissions.addAll(Arrays.asList(s.split(" ")));
                log.debug("Found scope claim: {}", s);
            }
            
            // Check scp claim (alternative scope format)
            Object scpClaim = jwt.getClaims().get("scp");
            if (scpClaim instanceof Collection<?> col) {
                col.forEach(o -> permissions.add(String.valueOf(o)));
                log.debug("Found scp claim: {}", col);
            }
            
            // Check permissions claim (Auth0 RBAC)
            Object permissionsClaim = jwt.getClaims().get("permissions");
            if (permissionsClaim instanceof Collection<?> col) {
                col.forEach(o -> permissions.add(String.valueOf(o)));
                log.debug("Found permissions claim: {}", col);
            }
            
            // Filter out empty strings and return as list
            return permissions.stream()
                .filter(s -> !s.isBlank())
                .collect(Collectors.toList());
                
        } catch (Exception e) {
            log.warn("Failed to extract permissions from JWT for user: {}", jwt.getSubject(), e);
            return List.of();
        }
    }
}
