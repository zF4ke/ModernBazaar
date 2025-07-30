package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.*;
import com.modernbazaar.core.service.BazaarItemsQueryService;
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

@RestController
@RequestMapping(path = "/api/bazaar/items", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Bazaar Items", description = "Operations related to Bazaar items")
public class BazaarItemsController {

    private final BazaarItemsQueryService service;

    @Operation(
            summary = "Get all items (latest snapshot)",
            description = "Returns a list of item summaries, optionally filtered and sorted. Supports pagination.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Successful operation")
            }
    )
    @GetMapping
    public PagedResponseDTO<BazaarItemSummaryResponseDTO> getItems(
            @Parameter(description = "Search query to filter items by name or ID")
            @RequestParam(required = false) String q,

            @Parameter(description = "Minimum sell price filter")
            @RequestParam(required = false) Double minSell,

            @Parameter(description = "Maximum sell price filter")
            @RequestParam(required = false) Double maxSell,

            @Parameter(description = "Minimum buy price filter")
            @RequestParam(required = false) Double minBuy,

            @Parameter(description = "Maximum buy price filter")
            @RequestParam(required = false) Double maxBuy,

            @Parameter(description = "Minimum spread filter")
            @RequestParam(required = false) Double minSpread,

            @Parameter(
                    description = "Sorting order. Options: 'spreadDesc', 'profitDesc', etc.",
                    example = "spreadDesc"
            )
            @RequestParam(required = false) String sort,

            @Parameter(description = "Page number (0-based)")
            @RequestParam(required = false, defaultValue = "0") Integer page,

            @Parameter(description = "Number of items per page")
            @RequestParam(required = false, defaultValue = "50") Integer limit
    ) {
        var filter = BazaarItemFilterDTO.of(q, minSell, maxSell, minBuy, maxBuy, minSpread);
        return service.getLatestPaginated(filter, Optional.ofNullable(sort), page, limit);
    }

    @Operation(
            summary = "Get item by product ID",
            description = "Returns full item detail for a specific product ID.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Item found"),
                    @ApiResponse(responseCode = "404", description = "Item not found")
            }
    )
    @GetMapping("/{productId}")
    public BazaarItemDetailResponseDTO getItem(
            @Parameter(in = ParameterIn.PATH, description = "The product ID of the item", required = true)
            @PathVariable String productId
    ) {
        return service.getItemDetail(productId);
    }

    @Operation(
            summary = "Hourly history for a product",
            description = """
        Returns all BazaarItemHourSummary rows for `productId` ordered ASC by hourStart.
        Optional `from` / `to` narrow the range (inclusive lower‑bound, exclusive upper‑bound).
        Optional `withPoints=true` embeds the kept minute points for each hour.
        """)
    @GetMapping("/{productId}/history")
    public List<BazaarHourSummaryResponseDTO> getItemHistory(
            @PathVariable String productId,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "false") boolean withPoints) {

        return service.getHistory(productId, from, to, withPoints);
    }
}
