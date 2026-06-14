package com.modernbazaar.core.api;

import com.modernbazaar.core.service.AppSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Public, lightweight status endpoint so the dashboard can show a maintenance
 * banner. Exempt from the maintenance filter (it must answer while down).
 */
@RestController
@RequestMapping(path = "/api/status", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Status")
public class StatusController {

    private final AppSettingsService settings;

    @GetMapping
    @Operation(summary = "Public service status")
    public Map<String, Object> status() {
        return Map.of("ok", true, "maintenance", settings.isMaintenanceMode());
    }
}
