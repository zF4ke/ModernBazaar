package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.*;
import com.modernbazaar.core.service.ItemQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping(path = "/api/items", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Items", description = "Operations related to Bazaar items")
public class ItemsController {

    private final ItemQueryService service;

    @Operation(
            summary = "Get all items (latest snapshot)",
            description = "Returns a list of item summaries, optionally filtered and sorted.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Successful operation")
            }
    )
    @GetMapping
    public List<ItemSummaryResponseDTO> getItems(
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
            @RequestParam(required = false, defaultValue = "spreadDesc") String sort,

            @Parameter(description = "Limit the number of returned items")
            @RequestParam(required = false) Integer limit
    ) {
        var filter = ItemFilterDTO.of(q, minSell, maxSell, minBuy, maxBuy, minSpread);
        return service.getLatest(filter, Optional.ofNullable(sort), Optional.ofNullable(limit));
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
    public ItemDetailResponseDTO getItem(
            @Parameter(in = ParameterIn.PATH, description = "The product ID of the item", required = true)
            @PathVariable String productId
    ) {
        return service.getItemDetail(productId);
    }
}
