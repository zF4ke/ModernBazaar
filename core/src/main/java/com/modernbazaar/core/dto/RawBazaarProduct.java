package com.modernbazaar.core.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
public class RawBazaarProduct {
    @JsonProperty("product_id")
    private String productId;

    private List<OrderEntry> sell_summary;
    private List<OrderEntry> buy_summary;

    @JsonProperty("quick_status")
    private QuickStatus quickStatus;

    @Data
    public static class OrderEntry {
        private long amount;
        private double pricePerUnit;
        private int orders;
    }

    @Data
    public static class QuickStatus {
        private String productId;
        private double sellPrice;
        private long sellVolume;
        private long sellMovingWeek;
        private int sellOrders;
        private double buyPrice;
        private long buyVolume;
        private long buyMovingWeek;
        private int buyOrders;
    }
}