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
@Tag(name = "Bazaar Items")
public class BazaarItemsController {

    private final BazaarItemsQueryService service;

    /* ---------- LIST ---------- */

    @GetMapping
    @Operation(summary = "Latest items (hourly close)",
            responses = @ApiResponse(responseCode = "200"))
    public PagedResponseDTO<BazaarItemHourSummaryResponseDTO> getItems(
            // … same @RequestParam parameters …
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Double minSell,
            @RequestParam(required = false) Double maxSell,
            @RequestParam(required = false) Double minBuy,
            @RequestParam(required = false) Double maxBuy,
            @RequestParam(required = false) Double minSpread,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0")  Integer page,
            @RequestParam(defaultValue = "50") Integer limit) {

        var filter = BazaarItemFilterDTO.of(q, minSell, maxSell, minBuy, maxBuy, minSpread);
        return service.getLatestPaginated(filter, Optional.ofNullable(sort), page, limit);
    }

    /* ---------- DETAIL ---------- */

    @GetMapping("/{productId}")
    @Operation(summary = "Single item (latest hour)",
            responses = {
                    @ApiResponse(responseCode = "200"),
                    @ApiResponse(responseCode = "404")})
    public BazaarItemHourSummaryResponseDTO getItem(
            @Parameter(in = ParameterIn.PATH, required = true)
            @PathVariable String productId) {

        return service.getItemSummary(productId);
    }

    /* ---------- HISTORY ---------- */

    @GetMapping("/{productId}/history")
    @Operation(summary = "Hourly history",
            description = "With ?withPoints=true each hour embeds its kept minute points.")
    public List<BazaarItemHourSummaryResponseDTO> getHistory(
            @PathVariable String productId,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "true") boolean withPoints) {

        return service.getHistory(productId, from, to, withPoints);
    }
}
