package com.modernbazaar.core.service;

import com.auth0.client.auth.AuthAPI;
import com.auth0.client.mgmt.ManagementAPI;
import com.auth0.client.mgmt.filter.RolesFilter;
import com.auth0.client.mgmt.filter.UserFilter;
import com.auth0.exception.Auth0Exception;
import com.auth0.json.auth.TokenHolder;
import com.auth0.json.mgmt.roles.Role;
import com.auth0.json.mgmt.users.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service for managing Auth0 users and roles through the Management API.
 * This service handles automatic role assignment for new users.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class Auth0ManagementService {

    @Value("${auth0.domain}")
    private String domain;

    @Value("${auth0.management.client-id}")
    private String clientId;

    @Value("${auth0.management.client-secret}")
    private String clientSecret;

    /** plan slug -> Auth0 role name. The role must carry the matching RBAC permissions. */
    private static final java.util.Map<String, String> PLAN_ROLE = java.util.Map.of(
            "free", "Free",
            "flipper", "Flipper",
            "elite", "Elite"
    );

    /**
     * Assigns the "Free" role to a new user (first-login setup). Delegates to
     * {@link #syncPlanRoles} so new users go through the same single path.
     */
    public boolean assignFreeRole(String userId) {
        return syncPlanRoles(userId, "free");
    }

    /**
     * Makes the user's Auth0 roles match their entitled plan: adds the role for
     * {@code planSlug} and removes the other managed plan roles. This is what actually
     * GRANTS feature scopes on upgrade and REVOKES them on downgrade/cancel — access
     * follows billing. The roles must carry the RBAC permissions (use:bazaar-flipping,
     * use:bazaar-manipulation, read:market_data) so they land in the token's
     * 'permissions' claim — configure that once in Auth0. Never throws; logs and returns
     * false if the Management API isn't configured.
     *
     * @return true on success
     */
    public boolean syncPlanRoles(String userId, String planSlug) {
        String target = PLAN_ROLE.getOrDefault(planSlug == null ? "free" : planSlug.toLowerCase(), "Free");
        try {
            ManagementAPI management = getManagementAPI();

            String targetRoleId = findRoleIdByName(management, target);
            if (targetRoleId == null) {
                log.warn("⚠️ Auth0 role '{}' not found - creating it. Configure its RBAC permissions in Auth0 or the plan grants no scopes.", target);
                targetRoleId = createRole(management, target, target + " plan");
            }

            // The user's current managed plan-roles.
            List<Role> current = management.users().listRoles(userId, null).execute().getBody().getItems();

            List<String> toRemove = current.stream()
                    .filter(r -> PLAN_ROLE.containsValue(r.getName()) && !target.equals(r.getName()))
                    .map(Role::getId)
                    .toList();
            if (!toRemove.isEmpty()) {
                management.users().removeRoles(userId, toRemove).execute();
                log.info("Removed stale plan roles {} from user {}", toRemove, userId);
            }

            boolean alreadyHas = current.stream().anyMatch(r -> target.equals(r.getName()));
            if (!alreadyHas) {
                assignRoleToUser(management, userId, targetRoleId);
            }
            log.info("✅ Synced user {} to plan role '{}'", userId, target);
            return true;
        } catch (Exception e) {
            log.error("❌ Failed to sync plan roles for user {} -> {}", userId, target, e);
            return false;
        }
    }
    
    /**
     * Gets a Management API instance with proper authentication.
     */
    private ManagementAPI getManagementAPI() throws Auth0Exception {
        String rawDomain = domain;
        String normalizedDomain = normalizeDomain(rawDomain);
        if (!rawDomain.equals(normalizedDomain)) {
            log.warn("Auth0 domain normalizado de '{}' para '{}'", rawDomain, normalizedDomain);
        } else {
            log.debug("Auth0 domain em uso: {}", normalizedDomain);
        }
        AuthAPI auth = new AuthAPI(normalizedDomain, clientId, clientSecret);
        String audience = "https://" + normalizedDomain + "/api/v2/";
        // Scopes necessários: listar roles (read:roles), criar role se faltar (create:roles), atribuir role a user (update:users)
        // read:users opcional para futura leitura de dados
        var response = auth.requestToken(audience)
                .setAudience(audience)
                .setScope("read:users update:users read:roles create:roles")
                .execute();
        var token = response.getBody();
        log.debug("Token scopes recebidos: {}", token.getScope());
        if (token.getScope() == null || !token.getScope().contains("update:users")) {
            log.warn("Token sem 'update:users' – atribuição de roles provavelmente falhará");
        }
        if (!token.getScope().contains("read:roles")) {
            log.warn("Token sem 'read:roles' – não será possível localizar role Free");
        }
        return ManagementAPI.newBuilder(normalizedDomain, token.getAccessToken()).build();
    }

    private String normalizeDomain(String d) {
        if (d == null) return null;
        String out = d.trim();
        if (out.startsWith("https://")) out = out.substring(8);
        else if (out.startsWith("http://")) out = out.substring(7);
        while (out.endsWith("/")) out = out.substring(0, out.length() - 1);
        return out;
    }
    
    /** Finds a role id by exact name, or null. */
    private String findRoleIdByName(ManagementAPI management, String name) throws Auth0Exception {
        RolesFilter filter = new RolesFilter();
        filter.withName(name);
        List<Role> roles = management.roles().list(filter).execute().getBody().getItems();
        return roles.stream().filter(r -> name.equals(r.getName())).map(Role::getId).findFirst().orElse(null);
    }

    /** Creates a role with no permissions (permissions are configured in Auth0). */
    private String createRole(ManagementAPI management, String name, String description) throws Auth0Exception {
        Role role = new Role();
        role.setName(name);
        role.setDescription(description);
        Role created = management.roles().create(role).execute().getBody();
        log.info("✅ Created Auth0 role '{}' (id {})", name, created.getId());
        return created.getId();
    }
    
    /**
     * Assigns a role to a user.
     */
    private void assignRoleToUser(ManagementAPI management, String userId, String roleId) throws Auth0Exception {
        try {
            List<String> roleIds = List.of(roleId);
            management.users().addRoles(userId, roleIds).execute();
            log.info("✅ Successfully assigned role {} to user {}", roleId, userId);
        } catch (Exception e) {
            log.error("❌ Failed to assign role {} to user {}: {}", roleId, userId, e.getMessage());
            throw e;
        }
    }
}
