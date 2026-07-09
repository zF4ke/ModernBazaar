package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.BazaarItemFilterDTO;
import com.modernbazaar.core.api.dto.FlipOpportunityResponseDTO;
import com.modernbazaar.core.api.dto.ManipulationOpportunityResponseDTO;
import com.modernbazaar.core.api.dto.PagedResponseDTO;
import com.modernbazaar.core.service.StrategyFlippingService;
import com.modernbazaar.core.service.StrategyManipulationService;
import com.modernbazaar.core.service.SubscriptionService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * REST controller for trading strategy analysis and recommendations.
 * 
 * This controller provides endpoints for:
 * - Analyzing bazaar flipping opportunities
 * - Filtering opportunities based on various criteria
 * - Calculating risk scores and competition analysis
 * 
 * All endpoints require appropriate tier permissions (starter, flipper, or elite).
 */
@RestController
@RequestMapping(path = "/api/strategies", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Trading Strategies")
public class StrategiesController {

    private final StrategyFlippingService flipping;
    private final StrategyManipulationService manipulation;
    private final SubscriptionService subscriptions;

    /** Gate a feature on the user's actual DB plan (not the token scope). */
    private void require(Jwt jwt, String scope) {
        if (jwt == null || !subscriptions.isEntitled(jwt.getSubject(), scope)) {
            throw new AccessDeniedException("Your plan doesn't include this feature");
        }
    }

    /**
     * Lists bazaar flipping opportunities based on current market conditions.
     * 
     * This endpoint analyzes current snapshots and 48-hour averages to identify
     * profitable flipping opportunities with advanced filtering options.
     * 
     * @param q Search query for item names
     * @param minSell Minimum sell price filter
     * @param maxSell Maximum sell price filter
     * @param minBuy Minimum buy price filter
     * @param maxBuy Maximum buy price filter
     * @param minSpread Minimum spread percentage filter
     * @param maxTime Maximum time to hold items
     * @param minUnitsPerHour Minimum units traded per hour
     * @param maxUnitsPerHour Maximum units traded per hour
     * @param maxCompetitionPerHour Maximum competition level
     * @param maxRiskScore Maximum risk score threshold
     * @param disableCompetitionPenalties Disable competition-based penalties
     * @param disableRiskPenalties Disable risk-based penalties
     * @param sort Sort field for results
     * @param budget Available budget for calculations
     * @param horizonHours Time horizon for analysis
     * @param page Page number (0-based)
     * @param limit Items per page
     * @return Paginated response with flipping opportunities
     */
    @GetMapping("/flipping")
    @Operation(summary = "Bazaar Flipping opportunities",
            description = "Lista oportunidades baseadas no snapshot atual e últimas médias de 48h.",
            responses = @ApiResponse(responseCode = "200"))
    @RateLimiter(name = "bazaarEndpoint")
    public PagedResponseDTO<FlipOpportunityResponseDTO> listFlipping(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Double minSell,
            @RequestParam(required = false) Double maxSell,
            @RequestParam(required = false) Double minBuy,
            @RequestParam(required = false) Double maxBuy,
            @RequestParam(required = false) Double minSpread,
            @RequestParam(required = false) Double maxTime,
            @RequestParam(required = false) Double minUnitsPerHour,
            @RequestParam(required = false) Double maxUnitsPerHour,
            @RequestParam(required = false) Double maxCompetitionPerHour,
            @RequestParam(required = false) Double maxRiskScore,
            @RequestParam(required = false) Boolean disableCompetitionPenalties,
            @RequestParam(required = false) Boolean disableRiskPenalties,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Double budget,
            @RequestParam(required = false) Double horizonHours,
            @RequestParam(defaultValue = "0")  Integer page,
            @RequestParam(defaultValue = "50") Integer limit
    ) {
        require(jwt, "use:bazaar-flipping");
        var filter = BazaarItemFilterDTO.of(q, minSell, maxSell, minBuy, maxBuy, minSpread,
                                           maxTime, minUnitsPerHour, maxUnitsPerHour);
        return flipping.listWithAdvancedFilters(filter, Optional.ofNullable(sort), page, limit, budget, horizonHours,
                                               maxTime, minUnitsPerHour, maxUnitsPerHour, maxCompetitionPerHour, maxRiskScore,
                                               Boolean.TRUE.equals(disableCompetitionPenalties),
                                               Boolean.TRUE.equals(disableRiskPenalties));
    }

    /**
     * Lists Bazaar Manipulation opportunities: items with thin supply and strong demand
     * that are cheap enough to corner within {@code budget}. Each result includes the full
     * plan — cost to corner, break-even resell price after tax, the inflated buy order and
     * sell wall, the doublings needed, expected profit and sell-through time.
     *
     * @param q          Search query for item names / ids
     * @param minSell    Minimum weighted 2% sell price filter
     * @param maxSell    Maximum weighted 2% sell price filter
     * @param minBuy     Minimum weighted 2% buy price filter
     * @param maxBuy     Maximum weighted 2% buy price filter
     * @param budget     Max coins to corner the market (items costing more are hidden)
     * @param roi        Buy-order inflation multiplier vs the break-even resell price (default 2.0 = double up)
     * @param taxRate    Selling tax assumed in the math (default 0.01125 = 1.125%)
     * @param sellWallFactor Sell wall = targetBuyOrder * factor (default 2.0)
     * @param minDemandSupplyRatio Hide items whose demand/supply ratio is below this
     * @param minProfit  Hide items whose total expected profit is below this
     * @param maxCornerSupply Hide items requiring more than this many units to corner
     * @param formulaVersion Scoring formula: overclocker | attention
     * @param sort       Sort field: score | profit | ratio | cornerCost | demand
     * @param page       Page number (0-based)
     * @param limit      Items per page
     */
    @GetMapping("/manipulation")
    @Operation(summary = "Bazaar Manipulation opportunities",
            description = "Items with thin supply and strong demand that can be cornered within budget, with a full execution plan.",
            responses = @ApiResponse(responseCode = "200"))
    @RateLimiter(name = "bazaarEndpoint")
    public PagedResponseDTO<ManipulationOpportunityResponseDTO> listManipulation(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Double minSell,
            @RequestParam(required = false) Double maxSell,
            @RequestParam(required = false) Double minBuy,
            @RequestParam(required = false) Double maxBuy,
            @RequestParam(required = false) Double budget,
            @RequestParam(required = false) Double roi,
            @RequestParam(required = false) Double taxRate,
            @RequestParam(required = false) Double sellWallFactor,
            @RequestParam(required = false) Double minDemandSupplyRatio,
            @RequestParam(required = false) Double minProfit,
            @RequestParam(required = false) Long maxCornerSupply,
            @RequestParam(required = false) String formulaVersion,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0")  Integer page,
            @RequestParam(defaultValue = "50") Integer limit
    ) {
        require(jwt, "use:bazaar-manipulation");
        var filter = BazaarItemFilterDTO.of(q, minSell, maxSell, minBuy, maxBuy, null);
        return manipulation.list(filter, Optional.ofNullable(sort), page, limit,
                                 budget, roi, taxRate, sellWallFactor, minDemandSupplyRatio, minProfit,
                                 maxCornerSupply, formulaVersion);
    }
}
