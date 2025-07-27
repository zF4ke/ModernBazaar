package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.MetricsResponseDTO;
import com.modernbazaar.core.service.MetricsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "/api/metrics", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Metrics", description = "System metrics and performance data")
public class MetricsController {

    private final MetricsService metricsService;

    @Operation(
            summary = "Get system metrics",
            description = "Returns system performance metrics and status information.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Successful operation")
            }
    )
    @GetMapping
    public MetricsResponseDTO getMetrics() {
        return metricsService.getSystemMetrics();
    }
} 