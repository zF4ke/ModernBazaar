package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.*;
import com.modernbazaar.core.service.BazaarItemsQueryService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * REST controller for managing Hypixel Skyblock Bazaar items.
 * 
 * This controller provides endpoints for:
 * - Listing bazaar items with filtering and pagination
 * - Getting detailed information about specific items
 * - Retrieving historical price data
 * - Calculating price averages
 * - Accessing latest market snapshots
 * 
 * All endpoints are rate-limited and require market data read permissions.
 */
@RestController
@RequestMapping(path = "/api/bazaar/items", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Bazaar Items")
public class BazaarItemsController {

    private final BazaarItemsQueryService service;

    /* ---------- LIST ---------- */

    /**
     * Retrieves a paginated list of bazaar items with optional filtering.
     * 
     * @param q Search query for item names
     * @param minSell Minimum sell price filter
     * @param maxSell Maximum sell price filter
     * @param minBuy Minimum buy price filter
     * @param maxBuy Maximum buy price filter
     * @param minSpread Minimum spread percentage filter
     * @param sort Sort field (optional)
     * @param page Page number (0-based)
     * @param limit Items per page
     * @param withHour Include hourly data in response
     * @return Paginated response with bazaar items
     */
    @GetMapping
    @Operation(summary = "Latest items (hourly close)",
            responses = @ApiResponse(responseCode = "200"))
    @RateLimiter(name = "bazaarEndpoint")
    public PagedResponseDTO<BazaarItemLiveViewResponseDTO> getItems(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Double minSell,
            @RequestParam(required = false) Double maxSell,
            @RequestParam(required = false) Double minBuy,
            @RequestParam(required = false) Double maxBuy,
            @RequestParam(required = false) Double minSpread,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0")  Integer page,
            @RequestParam(defaultValue = "50") Integer limit,
            @RequestParam(
                name = "withHour",
                defaultValue = "false"
            ) boolean withHour) {

        var filter = BazaarItemFilterDTO.of(q, minSell, maxSell, minBuy, maxBuy, minSpread);
        return service.getLatestPaginated(filter, Optional.ofNullable(sort), page, limit, withHour);
    }

    /* ---------- DETAIL ---------- */

    /**
     * Retrieves detailed information about a specific bazaar item.
     * 
     * @param productId The unique identifier of the bazaar item
     * @return Detailed bazaar item information
     */
    @GetMapping("/{productId}")
    @Operation(summary = "Single item (latest hour)",
            responses = {
                    @ApiResponse(responseCode = "200"),
                    @ApiResponse(responseCode = "404")})
    @RateLimiter(name = "bazaarEndpoint")
    public BazaarItemLiveViewResponseDTO getItem(
            @Parameter(in = ParameterIn.PATH, required = true)
            @PathVariable String productId) {

        return service.getItem(productId);
    }

    /* ---------- HISTORY ---------- */

    /**
     * Retrieves hourly price history for a specific bazaar item.
     * 
     * @param productId The unique identifier of the bazaar item
     * @param from Start time for history range (optional)
     * @param to End time for history range (optional)
     * @param withPoints Include minute-level data points in each hour
     * @return List of hourly price summaries
     */
    @GetMapping("/{productId}/history")
    @Operation(summary = "Hourly history",
            description = "With ?withPoints=true each hour embeds its kept minute points.")
    @RateLimiter(name = "bazaarEndpoint")
    public List<BazaarItemHourSummaryResponseDTO> getHistory(
            @PathVariable String productId,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "true") boolean withPoints) {

        return service.getHistory(productId, from, to, withPoints);
    }

    /* ---------- AVERAGE ---------- */

    /**
     * Calculates the average price over the last 48 hours for a specific item.
     * 
     * @param productId The unique identifier of the bazaar item
     * @return Average price data for the last 48 hours
     */
    @GetMapping("/{productId}/average")
    @Operation(summary = "Last 48 hour average",
            description = "Get the average of the last 48 hour summaries for a product.")
    @RateLimiter(name = "bazaarEndpoint")
    public BazaarItemHourAverageResponseDTO getLast48HourAverage(
            @Parameter(in = ParameterIn.PATH, required = true)
            @PathVariable String productId) {

        return service.getLast48HourAverage(productId);
    }

    /* ---------- LATEST SNAPSHOTS ---------- */

    /**
     * Retrieves the latest unprocessed market snapshots for a specific item.
     * 
     * @param productId The unique identifier of the bazaar item
     * @param limit Maximum number of snapshots to return
     * @return List of latest market snapshots
     */
    @GetMapping("/{productId}/snapshots")
    @Operation(summary = "Latest snapshots",
            description = "Get the latest snapshots from the last hour that haven't been processed into hourly summaries yet.")
    @RateLimiter(name = "bazaarEndpoint")
    public List<BazaarItemHourSummaryResponseDTO> getLatestSnapshots(
            @Parameter(in = ParameterIn.PATH, required = true)
            @PathVariable String productId,
            @RequestParam(defaultValue = "5") int limit) {

        return service.getLatestSnapshots(productId, limit);
    }
}
