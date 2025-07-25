package com.modernbazaar.core.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.modernbazaar.core.domain.BazaarProductSnapshot;
import com.modernbazaar.core.dto.RawBazaarProduct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class BazaarSnapshotMapper {

    private final ObjectMapper objectMapper;

    /**
     * Converts a RawBazaarProduct into a BazaarProductSnapshot.
     *
     * @param raw the raw bazaar product data
     * @param apiLastUpdated the last updated timestamp from the API
     * @return a BazaarProductSnapshot containing serialized JSON summaries
     * @throws IllegalStateException if serialization fails
     */
    public BazaarProductSnapshot toSnapshot(RawBazaarProduct raw, long apiLastUpdated) {
        try {
            String sellJson  = objectMapper.writeValueAsString(raw.getSell_summary());
            String buyJson   = objectMapper.writeValueAsString(raw.getBuy_summary());
            String quickJson = objectMapper.writeValueAsString(raw.getQuickStatus());

            return BazaarProductSnapshot.builder()
                    .productId(raw.getProductId())
                    .lastUpdated(Instant.ofEpochMilli(apiLastUpdated))
                    .fetchedAt(Instant.now())
                    .sellSummaryJson(sellJson)
                    .buySummaryJson(buyJson)
                    .quickStatusJson(quickJson)
                    .build();
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize bazaar product JSON", e);
        }
    }
}