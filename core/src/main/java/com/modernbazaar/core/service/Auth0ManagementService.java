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

    /**
     * Assigns the "Free" role to a new user in Auth0.
     * 
     * @param userId The Auth0 user ID (sub claim)
     * @return true if role was assigned successfully, false otherwise
     */
    public boolean assignFreeRole(String userId) {
        try {
            log.info("🔄 Assigning Free role to user: {}", userId);
            
            // Get Management API access
            ManagementAPI management = getManagementAPI();
            
            // Find the Free role
            String freeRoleId = findFreeRoleId(management);
            if (freeRoleId == null) {
                log.warn("⚠️ Free role not found in Auth0 - creating it");
                freeRoleId = createFreeRole(management);
            }
            
            // Assign role to user
            assignRoleToUser(management, userId, freeRoleId);
            
            log.info("✅ Successfully assigned Free role to user: {}", userId);
            return true;
            
        } catch (Exception e) {
            log.error("❌ Failed to assign Free role to user: {}", userId, e);
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
    
    /**
     * Finds the Free role ID in Auth0.
     */
    private String findFreeRoleId(ManagementAPI management) throws Auth0Exception {
        RolesFilter filter = new RolesFilter();
        filter.withName("Free");
        
        var response = management.roles().list(filter).execute();
        List<Role> roles = response.getBody().getItems();
        return roles.isEmpty() ? null : roles.get(0).getId();
    }
    
    /**
     * Creates the Free role if it doesn't exist.
     */
    private String createFreeRole(ManagementAPI management) throws Auth0Exception {
        Role role = new Role();
        role.setName("Free");
        role.setDescription("Basic user role with free plan access");
        
        var response = management.roles().create(role).execute();
        Role createdRole = response.getBody();
        log.info("✅ Created Free role in Auth0 with ID: {}", createdRole.getId());
        
        return createdRole.getId();
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
