package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.BazaarItemFilterDTO;
import com.modernbazaar.core.api.dto.FlipOpportunityResponseDTO;
import com.modernbazaar.core.api.dto.PagedResponseDTO;
import com.modernbazaar.core.service.StrategyFlippingService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping(path = "/api/strategies", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Trading Strategies")
public class StrategiesController {

    private final StrategyFlippingService flipping;

    @GetMapping("/flipping")
    @Operation(summary = "Bazaar Flipping opportunities",
            description = "Lista oportunidades baseadas no snapshot atual e últimas médias de 48h.",
            responses = @ApiResponse(responseCode = "200"))
    @RateLimiter(name = "bazaarEndpoint")
    public PagedResponseDTO<FlipOpportunityResponseDTO> listFlipping(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Double minSell,
            @RequestParam(required = false) Double maxSell,
            @RequestParam(required = false) Double minBuy,
            @RequestParam(required = false) Double maxBuy,
            @RequestParam(required = false) Double minSpread,
            @RequestParam(required = false) Double maxTime,
            @RequestParam(required = false) Double minUnitsPerHour,
            @RequestParam(required = false) Double maxUnitsPerHour,
            @RequestParam(required = false) Boolean disableCompetitionPenalties,
            @RequestParam(required = false) Boolean disableRiskPenalties,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Double budget,
            @RequestParam(required = false) Double horizonHours,
            @RequestParam(defaultValue = "0")  Integer page,
            @RequestParam(defaultValue = "50") Integer limit
    ) {
        var filter = BazaarItemFilterDTO.of(q, minSell, maxSell, minBuy, maxBuy, minSpread,
                                           maxTime, minUnitsPerHour, maxUnitsPerHour);
        return flipping.listWithAdvancedFilters(filter, Optional.ofNullable(sort), page, limit, budget, horizonHours,
                                               maxTime, minUnitsPerHour, maxUnitsPerHour,
                                               Boolean.TRUE.equals(disableCompetitionPenalties),
                                               Boolean.TRUE.equals(disableRiskPenalties));
    }
}
