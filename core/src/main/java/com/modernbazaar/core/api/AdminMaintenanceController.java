package com.modernbazaar.core.api;

import com.modernbazaar.core.service.AppSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Maintenance-mode kill switch (admin only). Exempt from the maintenance filter
 * so it can always be reached to turn the site back on.
 */
@RestController
@RequestMapping(path = "/api/admin/maintenance", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Admin Maintenance")
public class AdminMaintenanceController {

    private final AppSettingsService settings;

    @GetMapping
    @Operation(summary = "Current maintenance-mode state")
    public Map<String, Boolean> get() {
        return Map.of("enabled", settings.isMaintenanceMode());
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Turn maintenance mode on/off")
    public Map<String, Boolean> set(@RequestBody Request body) {
        settings.setMaintenanceMode(body.enabled());
        return Map.of("enabled", settings.isMaintenanceMode());
    }

    public record Request(boolean enabled) {}
}
