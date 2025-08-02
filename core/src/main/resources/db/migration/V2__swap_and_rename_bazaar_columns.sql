-- 1) Swap the BUY/SELL counts & volumes in the raw‐snapshot table
UPDATE bazaar_product_snapshot
SET (active_buy_orders_count, active_sell_orders_count) =
        (active_sell_orders_count, active_buy_orders_count),
    (buy_volume, sell_volume) =
        (sell_volume, buy_volume);

-- 2) Swap the same in the hour‐point table
UPDATE bazaar_hour_point
SET (active_buy_orders_count, active_sell_orders_count) =
        (active_sell_orders_count, active_buy_orders_count),
    (buy_volume, sell_volume) =
        (sell_volume, buy_volume);

-- 3) Rename metrics in the hour‐summary table
ALTER TABLE bazaar_hour_summary RENAME COLUMN new_buy_orders        TO created_sell_orders;
ALTER TABLE bazaar_hour_summary RENAME COLUMN new_sell_orders       TO created_buy_orders;
ALTER TABLE bazaar_hour_summary RENAME COLUMN delta_new_buy_orders  TO delta_sell_orders;
ALTER TABLE bazaar_hour_summary RENAME COLUMN delta_new_sell_orders TO delta_buy_orders;
ALTER TABLE bazaar_hour_summary RENAME COLUMN items_listed_buy_orders  TO added_items_sell_orders;
ALTER TABLE bazaar_hour_summary RENAME COLUMN items_listed_sell_orders TO added_items_buy_orders;
