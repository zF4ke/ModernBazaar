package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.SubscriptionResponseDTO;
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

import java.util.List;

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
}
