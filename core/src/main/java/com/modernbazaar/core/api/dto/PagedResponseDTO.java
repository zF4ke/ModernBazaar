package com.modernbazaar.core.api.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public record PagedResponseDTO<T>(
        List<T> items,
        int page,
        int limit,
        int totalItems,
        int totalPages,
        boolean hasNext,
        boolean hasPrevious
) {
    public static <T> PagedResponseDTO<T> of(List<T> allItems, int page, int limit) {
        int totalItems = allItems.size();
        int totalPages = totalItems == 0 ? 1 : (int) Math.ceil((double) totalItems / limit);

        if (page < 0) page = 0;
        else if (page >= totalPages) page = Math.max(0, totalPages - 1);

        int startIndex = page * limit;
        int endIndex = Math.min(startIndex + limit, totalItems);

        List<T> pageItems = startIndex < totalItems ? allItems.subList(startIndex, endIndex) : List.of();

        return new PagedResponseDTO<>(
                pageItems,
                page,
                limit,
                totalItems,
                totalPages,
                page < totalPages - 1,
                page > 0
        );
    }

    public static <T> PagedResponseDTO<T> fromPage(Page<T> page) {
        return new PagedResponseDTO<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                (int) page.getTotalElements(),
                Math.max(page.getTotalPages(), 1),
                page.hasNext(),
                page.hasPrevious()
        );
    }
}
