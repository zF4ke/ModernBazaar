package com.modernbazaar.core.api.dto;

public record BazaarItemFilterDTO(
        String q,
        Double minSell,
        Double maxSell,
        Double minBuy,
        Double maxBuy,
        Double minSpread
) {
    public static BazaarItemFilterDTO of(String q, Double minSell, Double maxSell,
                                         Double minBuy, Double maxBuy, Double minSpread) {
        return new BazaarItemFilterDTO(emptyToNull(q), minSell, maxSell, minBuy, maxBuy, minSpread);
    }

    /**
     * Converts an empty or blank string to null.
     * This is useful for filtering parameters where an empty string should be treated as no filter.
     *
     * @param s the string to check
     * @return null if the string is null or blank, otherwise returns the original string
     */
    private static String emptyToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
