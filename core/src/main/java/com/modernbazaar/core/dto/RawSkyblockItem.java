package com.modernbazaar.core.dto;

import lombok.Data;

import java.util.Map;

@Data
public class RawSkyblockItem {
    private String id;
    private String name;
    private String material;
    private String color;
    private String category;
    private String tier;
    private Double npc_sell_price; // API uses snake_case
    private Map<String, Object> stats;
}
