package com.modernbazaar.core.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.modernbazaar.core.domain.SkyblockItem;
import com.modernbazaar.core.dto.RawSkyblockItem;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class RawSkyblockItemToItemMapper {

    private final ObjectMapper objectMapper;

    public SkyblockItem toEntity(RawSkyblockItem raw, Instant refreshedAt) {
        String statsJson = null;
        try {
            if (raw.getStats() != null) {
                statsJson = objectMapper.writeValueAsString(raw.getStats());
            }
        } catch (JsonProcessingException e) {
            // keep statsJson = null on serialization failures
        }

        return SkyblockItem.builder()
                .id(raw.getId())
                .name(raw.getName() != null ? raw.getName() : raw.getId())
                .material(raw.getMaterial())
                .color(raw.getColor())
                .category(raw.getCategory())
                .tier(raw.getTier())
                .npcSellPrice(raw.getNpc_sell_price())
                .statsJson(statsJson)
                .lastRefreshed(refreshedAt)
                .build();
    }
}
