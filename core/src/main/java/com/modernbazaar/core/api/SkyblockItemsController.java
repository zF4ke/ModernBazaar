package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.PagedResponseDTO;
import com.modernbazaar.core.api.dto.SkyblockItemDTO;
import com.modernbazaar.core.service.SkyblockItemsCatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

/**
 * REST controller for managing Hypixel Skyblock item catalog.
 * 
 * This controller provides endpoints for:
 * - Searching and browsing the static item catalog
 * - Retrieving individual item details
 * - Managing catalog refresh operations
 * 
 * The catalog contains static item information from Hypixel's resources API.
 */
@RestController
@RequestMapping(path = "/api/skyblock/items", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Skyblock Items", description = "Static SkyBlock item catalog from Hypixel resources API")
public class SkyblockItemsController {

    private final SkyblockItemsCatalogService service;

    /**
     * Searches the Skyblock item catalog with optional filtering and pagination.
     * 
     * @param q Search query for item names
     * @param tier Item rarity tier filter
     * @param category Item category filter
     * @param inBazaar Filter for items available in bazaar
     * @param minNpc Minimum NPC sell price filter
     * @param maxNpc Maximum NPC sell price filter
     * @param page Page number (0-based)
     * @param limit Items per page
     * @return Paginated response with matching items
     */
    @Operation(summary = "Search catalog (paginated)")
    @GetMapping
    public PagedResponseDTO<SkyblockItemDTO> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tier,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) boolean inBazaar,
            @RequestParam(required = false) Double minNpc,
            @RequestParam(required = false) Double maxNpc,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return service.search(q, tier, category, inBazaar, minNpc, maxNpc, page, limit);
    }

    /**
     * Retrieves detailed information about a specific Skyblock item.
     * 
     * @param id The unique identifier of the Skyblock item
     * @return Detailed item information
     */
    @Operation(summary = "Get single item by ID")
    @GetMapping("/{id}")
    public SkyblockItemDTO getById(@PathVariable String id) {
        return service.getById(id);
    }

    /**
     * Forces an immediate refresh of the item catalog from Hypixel's API.
     * 
     * This operation may take some time to complete as it fetches the entire catalog.
     */
    @Operation(summary = "Force refresh the catalog now")
    @PostMapping("/refresh")
    public void forceRefresh() {
        service.forceRefresh();
    }

    /**
     * Refreshes the catalog only if it's older than the specified number of days.
     * 
     * @param days Minimum age in days before refresh is performed
     * @return true if refresh was performed, false if catalog was still fresh
     */
    @Operation(summary = "Refresh if stale (older than given days)")
    @PostMapping("/refresh-if-stale")
    public boolean refreshIfStale(@RequestParam(defaultValue = "30") int days) {
        return service.refreshIfStale(Duration.ofDays(days));
    }
}
