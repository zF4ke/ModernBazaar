package com.modernbazaar.core.repository.projection;

/**
 * Aggregate of the visible sell-side order book for an item's latest snapshot.
 * Used by the Bazaar Manipulation strategy to estimate how much it costs to
 * "corner" (insta-buy) all standing sell offers.
 */
public interface SellSideAggregateRow {
    String getProductId();

    /** Total units across all visible sell orders. */
    long getUnits();

    /** Total coins required to insta-buy every visible sell order (sum of amount * pricePerUnit). */
    double getCost();
}
