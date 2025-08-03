-- index for fast “latest snapshot per product” queries
CREATE INDEX IF NOT EXISTS idx_snapshot_product_id_fetched_at
    ON bazaar_product_snapshot(product_id, fetched_at DESC);

-- index for fast “latest hour summary per product” queries
CREATE INDEX IF NOT EXISTS idx_hour_summary_product_id_hour_start
    ON bazaar_hour_summary(product_id, hour_start DESC);

-- index to speed up the join/filter on bazaar_item → skyblock_item
CREATE INDEX IF NOT EXISTS idx_skyblock_item_name_lower
    ON skyblock_item(LOWER(name));

-- ensure simple lookups by product_id on bazaar_item are fast
CREATE INDEX IF NOT EXISTS idx_bazaar_item_product_id
    ON bazaar_item(product_id);
