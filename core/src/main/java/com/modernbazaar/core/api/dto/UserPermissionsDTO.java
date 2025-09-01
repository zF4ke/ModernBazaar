package com.modernbazaar.core.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * DTO for user permissions response
 */
@Data
@Builder
public class UserPermissionsDTO {
    
    @JsonProperty("permissions")
    private List<String> permissions;
    
    @JsonProperty("subscriptionTier")
    private String subscriptionTier;
    
    @JsonProperty("expiresAt")
    private OffsetDateTime expiresAt;
}
