package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.SubscriptionResponseDTO;
import com.modernbazaar.core.repository.PlanRepository;
import com.modernbazaar.core.service.UserManagementService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Slf4j
public class UserSetupController {

    private final UserManagementService userManagementService;
    private final PlanRepository planRepository;
    private final com.modernbazaar.core.service.ReferralAnalyticsService referralAnalytics;

    @PostMapping("/me/setup")
    @RateLimiter(name = "userSetupEndpoint")
    public ResponseEntity<SubscriptionResponseDTO> ensureUserSetup(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody(required = false) SetupRequest body) {
        try {
            if (jwt == null) {
                log.warn("Setup endpoint called without valid JWT token");
                return ResponseEntity.status(401).build();
            }

            String userId = jwt.getSubject();
            // Prefer email/name from the body (the dashboard has them from the ID token);
            // fall back to access-token claims if present.
            String email = (body != null && body.email() != null && !body.email().isBlank())
                    ? body.email() : jwt.getClaimAsString("email");
            String name = (body != null && body.name() != null && !body.name().isBlank())
                    ? body.name() : jwt.getClaimAsString("name");

            log.info("Setting up user: {} (email: {})", userId, email);

            var subscription = userManagementService.ensureNewUserSetup(userId, email, name);
            var plan = planRepository.findBySlug(subscription.getPlanSlug()).orElse(null);

            // Attribute the signup to a referral code if the dashboard forwarded one
            // (mb_ref cookie). Idempotent and best-effort — never fails the setup.
            if (body != null && body.ref() != null) {
                try {
                    referralAnalytics.recordSignup(body.ref(), userId);
                } catch (Exception e) {
                    log.debug("Referral signup attribution failed for {}: {}", userId, e.getMessage());
                }
            }
            
            log.info("User setup completed successfully for: {}", userId);
            return ResponseEntity.ok(SubscriptionResponseDTO.from(subscription, plan));
            
        } catch (Exception e) {
            String userId = jwt != null ? jwt.getSubject() : "unknown";
            log.error("Error setting up user: {}", userId, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    public record SetupRequest(String email, String name, String ref) {}
}
