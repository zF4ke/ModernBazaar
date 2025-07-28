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

@RestController
@RequestMapping(path = "/api/skyblock/items", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Skyblock Items", description = "Static SkyBlock item catalog from Hypixel resources API")
public class SkyblockItemsController {

    private final SkyblockItemsCatalogService service;

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

    @Operation(summary = "Get single item by ID")
    @GetMapping("/{id}")
    public SkyblockItemDTO getById(@PathVariable String id) {
        return service.getById(id);
    }

    @Operation(summary = "Force refresh the catalog now")
    @PostMapping("/refresh")
    public void forceRefresh() {
        service.forceRefresh();
    }

    @Operation(summary = "Refresh if stale (older than given days)")
    @PostMapping("/refresh-if-stale")
    public boolean refreshIfStale(@RequestParam(defaultValue = "30") int days) {
        return service.refreshIfStale(Duration.ofDays(days));
    }
}
