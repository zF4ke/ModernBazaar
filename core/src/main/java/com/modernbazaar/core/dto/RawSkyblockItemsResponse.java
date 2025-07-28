package com.modernbazaar.core.dto;

import lombok.Data;

import java.util.List;

@Data
public class RawSkyblockItemsResponse {
    private boolean success;
    private long lastUpdated;
    private List<RawSkyblockItem> items;
}
