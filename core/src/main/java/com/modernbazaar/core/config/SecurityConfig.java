package com.modernbazaar.core.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Spring Security configuration for the Modern Bazaar application.
 *
 * This class configures:
 * - JWT-based authentication using Auth0
 * - Endpoint-level security with role-based access control
 * - Permission scopes for different user tiers
 * - Public and protected endpoint definitions
 *
 * The security model uses OAuth2 scopes that map to user permissions:
 * - read:plans — View subscription plans
 * - read:subscription — View user subscription
 * - read:market_data — Access bazaar/skyblock data
 * - manage:plans — Admin: manage subscription plans
 * - use:starter — Basic tier features
 * - use:flipper — Flipper tier features
 * - use:elite — Elite tier features
 */
@Configuration
@EnableMethodSecurity
@Slf4j
public class SecurityConfig {

    // ============================================================================
    // Security Scope Constants
    // ============================================================================
    
    /**
     * Permission to view subscription plans.
     */
    public static final String SCOPE_READ_PLANS = "SCOPE_read:plans";
    
    /**
     * Permission to view user subscription details.
     */
    public static final String SCOPE_READ_SUBSCRIPTION = "SCOPE_read:subscription";
    
    /**
     * Permission to access bazaar and skyblock market data.
     */
    public static final String SCOPE_READ_MARKET_DATA = "SCOPE_read:market_data";
    
    /**
     * Admin permission to manage subscription plans.
     */
    public static final String SCOPE_MANAGE_PLANS = "SCOPE_manage:plans";
    
    /**
     * Permission to use starter tier features.
     */
    public static final String SCOPE_USE_STARTER = "SCOPE_use:starter";
    
    /**
     * Permission to use flipper tier features.
     */
    public static final String SCOPE_USE_FLIPPER = "SCOPE_use:flipper";
    
    /**
     * Permission to use elite tier features.
     */
    public static final String SCOPE_USE_ELITE = "SCOPE_use:elite";
    
    /**
     * Array of all tier-based permissions for easy validation.
     */
    public static final String[] TIER_PERMISSIONS = {
        SCOPE_USE_STARTER, 
        SCOPE_USE_FLIPPER, 
        SCOPE_USE_ELITE
    };
    
    /**
     * Returns all available scopes for documentation and testing purposes.
     * 
     * @return Array of all available permission scopes
     */
    public static String[] getAllScopes() {
        return new String[]{
            SCOPE_READ_PLANS,
            SCOPE_READ_SUBSCRIPTION,
            SCOPE_READ_MARKET_DATA,
            SCOPE_MANAGE_PLANS,
            SCOPE_USE_STARTER,
            SCOPE_USE_FLIPPER,
            SCOPE_USE_ELITE
        };
    }

    // ============================================================================
    // Configuration Properties
    // ============================================================================
    
    /**
     * Auth0 JWKS URI for JWT validation.
     */
    @Value("${auth.jwks-uri:}")
    private String jwksUri;
    
    /**
     * Auth0 issuer URI for JWT validation.
     */
    @Value("${auth.issuer-uri:}")
    private String issuer;
    
    /**
     * Auth0 audience for JWT validation.
     */
    @Value("${auth.audience:}")
    private String audience;

    // ============================================================================
    // Security Configuration Beans
    // ============================================================================
    
    /**
     * Configures the main security filter chain for the application.
     *
     * This method sets up:
     * - CSRF protection (disabled for API)
     * - Stateless session management
     * - Endpoint-level authorization rules
     * - JWT-based authentication
     *
     * @param http The HttpSecurity builder
     * @return Configured SecurityFilterChain
     * @throws Exception if configuration fails
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        log.info("Configuring security filter chain");
        log.info("Public endpoints: {}", Arrays.toString(getPublicEndpoints()));
        log.info("Admin endpoints: {}", Arrays.toString(getAdminEndpoints()));
        log.info("Read-only endpoints: {}", Arrays.toString(getReadOnlyEndpoints()));
        log.info("Subscription endpoints: {}", Arrays.toString(getSubscriptionEndpoints()));
        log.info("Market data endpoints: {}", Arrays.toString(getMarketDataEndpoints()));
        
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(reg -> reg
                        .requestMatchers(getPublicEndpoints()).permitAll()
                        .requestMatchers(getAdminEndpoints()).hasAuthority(SCOPE_MANAGE_PLANS)
                        .requestMatchers(getStrategyEndpoints()).hasAnyAuthority(TIER_PERMISSIONS)
                        .requestMatchers(getReadOnlyEndpoints()).hasAuthority(SCOPE_READ_PLANS)
                        .requestMatchers(getSubscriptionEndpoints()).hasAuthority(SCOPE_READ_SUBSCRIPTION)
                        .requestMatchers(getMarketDataEndpoints()).hasAuthority(SCOPE_READ_MARKET_DATA)
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(apiSecurityExceptionHandler())
                        .accessDeniedHandler(apiSecurityAccessDeniedHandler())
                )
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                        .authenticationEntryPoint(apiSecurityExceptionHandler())
                        .accessDeniedHandler(apiSecurityAccessDeniedHandler())
                );
        
        log.info("Security filter chain configured successfully");
        return http.build();
    }

    /**
     * Single handler instance configured as both the AuthenticationEntryPoint
     * (for 401) and AccessDeniedHandler (for 403). Ensures consistent JSON
     * payloads with permission context across the whole security layer.
     */
    @Bean
    public AuthenticationEntryPoint apiSecurityExceptionHandler() {
        return new com.modernbazaar.core.security.ApiSecurityExceptionHandler(this);
    }

    /**
     * Exposes the same handler bean as an AccessDeniedHandler for 403 cases.
     */
    @Bean
    public AccessDeniedHandler apiSecurityAccessDeniedHandler() {
        return (AccessDeniedHandler) apiSecurityExceptionHandler();
    }

    // ============================================================================
    // Endpoint Configuration Methods
    // ============================================================================
    
    /**
     * Returns endpoints that don't require authentication.
     * 
     * @return Array of public endpoint patterns
     */
    private String[] getPublicEndpoints() {
        return new String[]{
                "/actuator/health",
                "/v3/api-docs/**",
                "/swagger-ui.html",
                "/swagger-ui/**",
                "/api/v1/billing/webhook/stripe",
                "/api/plans"
        };
    }
    
    /**
     * Returns admin endpoints requiring manage:plans permission.
     * 
     * @return Array of admin endpoint patterns
     */
    private String[] getAdminEndpoints() {
        return new String[]{
                "/api/admin/**"
        };
    }
    
    /**
     * Returns strategy endpoints requiring tier-based permissions.
     * 
     * @return Array of strategy endpoint patterns
     */
    private String[] getStrategyEndpoints() {
        return new String[]{
                "/api/strategies/**"
        };
    }
    
    /**
     * Returns read-only endpoints requiring read:plans permission.
     * 
     * @return Array of read-only endpoint patterns
     */
    private String[] getReadOnlyEndpoints() {
        return new String[]{
                // Plans endpoint moved to public endpoints
        };
    }
    
    /**
     * Returns subscription endpoints requiring read:subscription permission.
     * 
     * @return Array of subscription endpoint patterns
     */
    private String[] getSubscriptionEndpoints() {
        return new String[]{
                "/api/me/**"
        };
    }
    
    /**
     * Returns market data endpoints requiring read:market_data permission.
     * 
     * @return Array of market data endpoint patterns
     */
    private String[] getMarketDataEndpoints() {
        return new String[]{
                "/api/bazaar/**",
                "/api/skyblock/**",
                "/api/metrics/**"
        };
    }

    // ============================================================================
    // JWT Configuration Beans
    // ============================================================================
    
    /**
     * Creates and configures the JWT decoder for token validation.
     *
     * This method:
     * - Uses real Auth0 JWKS for production
     * - Falls back to test decoder for development
     * - Configures proper token validation
     *
     * @return Configured JwtDecoder
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        if (jwksUri == null || jwksUri.isBlank()) {
            log.warn("No JWKS URI configured, using test JWT decoder");
            return createTestJwtDecoder();
        }
        log.info("Using real JWT decoder with JWKS URI: {}", jwksUri);
        return buildRealJwtDecoder();
    }
    
    /**
     * Creates a real JWT decoder based on JWKS configuration.
     *
     * @return Configured JwtDecoder with real Auth0 validation
     */
    private JwtDecoder buildRealJwtDecoder() {
        try {
            log.info("Building real JWT decoder with JWKS URI: {}", jwksUri);
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwksUri).build();
            decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(buildValidators()));
            log.info("Real JWT decoder built successfully");
            return decoder;
        } catch (Exception e) {
            log.error("Failed to build real JWT decoder, falling back to test decoder", e);
            return createTestJwtDecoder();
        }
    }
    
    /**
     * Creates a test JWT decoder for development when no real Auth0 config is available.
     *
     * @return Test JwtDecoder with hardcoded permissions
     */
    private JwtDecoder createTestJwtDecoder() {
        return tokenValue -> Jwt.withTokenValue(tokenValue)
                .header("alg", "none")
                .claims(c -> {
                    c.put("sub", "test-user");
                    c.put("scope", "read:plans read:subscription read:market_data manage:plans use:starter use:flipper use:elite");
                })
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
    }
    
    /**
     * Builds a list of validators for JWT tokens.
     *
     * @return List of OAuth2TokenValidator instances
     */
    private List<OAuth2TokenValidator<Jwt>> buildValidators() {
        List<OAuth2TokenValidator<Jwt>> validators = new ArrayList<>();
        validators.add(JwtValidators.createDefaultWithIssuer(issuer));
        
        if (audience != null && !audience.isBlank()) {
            validators.add(new JwtClaimValidator<>("aud", aud -> {
                if (aud instanceof String s) return s.equals(audience);
                if (aud instanceof Collection<?> col) return col.contains(audience);
                return false;
            }));
        }
        
        validators.add(new JwtTimestampValidator());
        return validators;
    }
    
    /**
     * Configures the JWT authentication converter to extract authorities from JWT claims.
     *
     * This converter processes:
     * - Traditional OAuth2 scope claims
     * - Auth0 RBAC permissions claims
     * - Various scope claim formats (scope, scp)
     *
     * @return Configured JwtAuthenticationConverter
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter conv = new JwtAuthenticationConverter();
        conv.setJwtGrantedAuthoritiesConverter(jwt -> {
            try {
                log.debug("Processing JWT for user: {}", jwt.getSubject());
                Set<String> scopes = new LinkedHashSet<>();
                
                // Check scope claim (traditional OAuth2)
                Object scopeClaim = jwt.getClaims().get("scope");
                if (scopeClaim instanceof String s) {
                    scopes.addAll(Arrays.asList(s.split(" ")));
                    log.debug("Found scope claim: {}", s);
                }
                
                // Check scp claim (alternative scope format)
                Object scpClaim = jwt.getClaims().get("scp");
                if (scpClaim instanceof Collection<?> col) {
                    col.forEach(o -> scopes.add(String.valueOf(o)));
                    log.debug("Found scp claim: {}", col);
                }
                
                // Check permissions claim (Auth0 RBAC)
                Object permissionsClaim = jwt.getClaims().get("permissions");
                if (permissionsClaim instanceof Collection<?> col) {
                    col.forEach(o -> scopes.add(String.valueOf(o)));
                    log.debug("Found permissions claim: {}", col);
                }
                
                if (scopes.isEmpty()) {
                    log.warn("No scopes found in JWT for user: {}", jwt.getSubject());
                    return List.of();
                }
                
                var authorities = scopes.stream()
                        .filter(s -> !s.isBlank())
                        .map(s -> (GrantedAuthority) new SimpleGrantedAuthority("SCOPE_" + s))
                        .collect(Collectors.toList());
                
                log.debug("Generated authorities for user {}: {}", jwt.getSubject(), authorities);
                return authorities;
            } catch (Exception e) {
                log.error("Error processing JWT for user: {}", jwt.getSubject(), e);
                return List.of();
            }
        });
        return conv;
    }
    
    /**
     * Gets the required permission for a specific endpoint.
     *
     * This method maps endpoints to their required permissions based on the
     * security configuration. It's useful for generating error messages and
     * documentation.
     *
     * @param endpoint The endpoint path to check
     * @return The required permission for the endpoint, or "unknown" if not found
     */
    public String getRequiredPermissionForEndpoint(String endpoint) {
        // Check admin endpoints first (most restrictive)
        for (String adminEndpoint : getAdminEndpoints()) {
            if (matchesEndpoint(endpoint, adminEndpoint)) {
                return SCOPE_MANAGE_PLANS;
            }
        }

        // Check subscription endpoints
        for (String subEndpoint : getSubscriptionEndpoints()) {
            if (matchesEndpoint(endpoint, subEndpoint)) {
                return SCOPE_READ_SUBSCRIPTION;
            }
        }

        // Check strategy endpoints
        for (String strategyEndpoint : getStrategyEndpoints()) {
            if (matchesEndpoint(endpoint, strategyEndpoint)) {
                return "use:starter, use:flipper, or use:elite";
            }
        }

        // Check market data endpoints
        for (String marketEndpoint : getMarketDataEndpoints()) {
            if (matchesEndpoint(endpoint, marketEndpoint)) {
                return SCOPE_READ_MARKET_DATA;
            }
        }

        // Check public endpoints (least restrictive)
        for (String publicEndpoint : getPublicEndpoints()) {
            if (matchesEndpoint(endpoint, publicEndpoint)) {
                return "none";
            }
        }

        return "unknown";
    }

    /**
     * Checks if an endpoint matches a pattern, handling wildcard patterns correctly.
     *
     * @param endpoint The endpoint path to check
     * @param pattern The pattern to match against (may contain /**)
     * @return true if the endpoint matches the pattern
     */
    private boolean matchesEndpoint(String endpoint, String pattern) {
        if (pattern.endsWith("/**")) {
            // Pattern like "/api/admin/**" should match "/api/admin/plans"
            String prefix = pattern.substring(0, pattern.length() - 3); // Remove "/**"
            return endpoint.startsWith(prefix);
        } else {
            // Exact match for patterns without wildcards
            return endpoint.equals(pattern);
        }
    }
}
