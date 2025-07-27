package com.modernbazaar.core.api.dto;

import java.util.List;

/**
 * Response DTO for paginated item lists, containing both the data and pagination metadata.
 */
public record PagedItemsResponseDTO(
        List<ItemSummaryResponseDTO> items,
        int page,
        int limit,
        int totalItems,
        int totalPages,
        boolean hasNext,
        boolean hasPrevious
) {
    public static PagedItemsResponseDTO of(List<ItemSummaryResponseDTO> allItems, int page, int limit) {
        int totalItems = allItems.size();
        int totalPages = totalItems == 0 ? 1 : (int) Math.ceil((double) totalItems / limit);
        
        // Validate page bounds
        if (page < 0) {
            page = 0;
        } else if (page >= totalPages) {
            page = Math.max(0, totalPages - 1);
        }
        
        int startIndex = page * limit;
        int endIndex = Math.min(startIndex + limit, totalItems);
        
        List<ItemSummaryResponseDTO> pageItems = startIndex < totalItems
                ? allItems.subList(startIndex, endIndex)
                : List.of();
        
        return new PagedItemsResponseDTO(
                pageItems,
                page,
                limit,
                totalItems,
                totalPages,
                page < totalPages - 1,
                page > 0
        );
    }
} 