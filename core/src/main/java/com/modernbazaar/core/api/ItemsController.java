package com.modernbazaar.core.api;

import com.modernbazaar.core.api.dto.*;
import com.modernbazaar.core.service.ItemQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping(path = "/api/items", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class ItemsController {

    private final ItemQueryService service;

    @GetMapping
    public List<ItemSummaryResponseDTO> getItems(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Double minSell,
            @RequestParam(required = false) Double maxSell,
            @RequestParam(required = false) Double minBuy,
            @RequestParam(required = false) Double maxBuy,
            @RequestParam(required = false) Double minSpread,
            @RequestParam(required = false, defaultValue = "spreadDesc") String sort,
            @RequestParam(required = false) Integer limit
    ) {
        var filter = ItemFilterDTO.of(q, minSell, maxSell, minBuy, maxBuy, minSpread);
        return service.getLatest(filter, Optional.ofNullable(sort), Optional.ofNullable(limit));
    }

    @GetMapping("/{productId}")
    public ItemDetailResponseDTO getItem(@PathVariable String productId) {
        return service.getItemDetail(productId);
    }
}
