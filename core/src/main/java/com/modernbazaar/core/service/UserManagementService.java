package com.modernbazaar.core.service;

import com.modernbazaar.core.domain.UserSubscription;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for managing user accounts and automatic role/plan assignment.
 * 
 * This service handles:
 * - Automatic user creation on first login
 * - Default role and plan assignment
 * - User metadata management
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserManagementService {

    private final SubscriptionService subscriptionService;
    private final Auth0ManagementService auth0Service;

    /**
     * Ensures a new user has the proper setup (free plan, basic permissions).
     * This method is called automatically when a user first logs in.
     * 
     * @param userId The Auth0 user ID (sub claim)
     * @param email The user's email address
     * @param nickname Optional nickname from social login
     * @return The created or existing user subscription
     */
    @Transactional
    public UserSubscription ensureNewUserSetup(String userId, String email, String nickname) {
        log.info("🆕 Setting up new user: {} (email: {})", userId, email);
        try {
            boolean roleAssigned = auth0Service.assignFreeRole(userId);
            if (!roleAssigned) {
                log.error("❌ Aborting user setup: failed to assign Auth0 Free role for user {}", userId);
                throw new RuntimeException("Auth0 role assignment failed");
            }
            log.info("✅ Auth0 role assignment successful for user: {}", userId);
            UserSubscription subscription = subscriptionService.ensureFreePlan(userId);
            log.info("✅ User setup completed for {}: plan={}, status= {}, auth0Role=true", userId, subscription.getPlanSlug(), subscription.getStatus());
            return subscription;
        } catch (Exception e) {
            log.error("❌ Failed to setup new user: {} (will not create subscription)", userId, e);
            throw new RuntimeException("Failed to setup new user: " + userId, e);
        }
    }

    /**
     * Checks if a user exists and has been properly set up.
     * 
     * @param userId The Auth0 user ID
     * @return true if user is properly set up, false otherwise
     */
    public boolean isUserSetup(String userId) {
        try {
            return subscriptionService.findCurrentForUser(userId).isPresent();
        } catch (Exception e) {
            log.warn("Could not check user setup status for: {}", userId, e);
            return false;
        }
    }
}
