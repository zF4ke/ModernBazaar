package com.modernbazaar.core.strategy;

/**
 * Shared constants for bazaar trading strategies.
 */
public final class BazaarConstants {

    private BazaarConstants() {}

    /**
     * Default Hypixel Bazaar tax applied when an item is sold (1.125%).
     * Selling a unit at price {@code p} nets {@code p * (1 - BAZAAR_TAX_RATE)}.
     * The effective rate can be lower with certain perks (down to ~1.0%),
     * so endpoints accept an override.
     */
    public static final double DEFAULT_BAZAAR_TAX_RATE = 0.01125;

    /**
     * Default return multiplier for the manipulation buy-order trap: the inflated
     * buy order is set at {@code DEFAULT_MANIPULATION_ROI * minResellPrice}, so a
     * value of 2.0 targets (at minimum) doubling the cornering capital.
     */
    public static final double DEFAULT_MANIPULATION_ROI = 2.0;

    /**
     * Default factor for the visible sell wall relative to the inflated buy order.
     * The sell order is placed at {@code targetBuyOrderPrice * DEFAULT_SELL_WALL_FACTOR}
     * to keep an attractive, eye-catching gap above the buy order.
     */
    public static final double DEFAULT_SELL_WALL_FACTOR = 2.0;
}
