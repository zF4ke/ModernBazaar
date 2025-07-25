package com.modernbazaar.core.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.Map;

@Data
public class RawBazaarResponse {
    private boolean success;
    private long lastUpdated;
    private Map<String, RawBazaarProduct> products;
}