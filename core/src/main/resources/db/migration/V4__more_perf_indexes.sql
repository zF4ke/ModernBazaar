/* ── snapshots ────────────────────────────────────────────────────────────── */

/* de-dup check in BazaarItemsFetchService.existsByProductIdAndLastUpdated(… ) */
CREATE INDEX IF NOT EXISTS idx_snapshot_product_lastupdated
    ON bazaar_product_snapshot(product_id, last_updated DESC);

/* follow-on SELECTs that load buy/sell order collections           */
CREATE INDEX IF NOT EXISTS idx_order_entry_snapshot
    ON bazaar_order_entry(snapshot_id, order_index);      -- covers ordering too

/* ── hourly summaries & minute points ────────────────────────────────────── */

/* join from BazaarItemHourSummary → BazaarItemHourPoint                     */
CREATE INDEX IF NOT EXISTS idx_hour_point_bazaar_hour_summary
    ON bazaar_hour_point(bazaar_hour_summary);

/* (already present) idx_hour_summary_product_id_hour_start
   (already present) idx_snapshot_product_id_fetched_at                   */
