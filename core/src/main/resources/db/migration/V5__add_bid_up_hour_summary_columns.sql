-- Manipulation metrics on hour summaries. These were added as NOT NULL entity
-- fields, which Hibernate ddl-auto silently FAILS to add to a table that
-- already has rows (no default). This migration does it properly and is
-- idempotent, so environments where the columns were added by hand are fine.
ALTER TABLE bazaar_hour_summary ADD COLUMN IF NOT EXISTS bid_up_moves bigint NOT NULL DEFAULT 0;
ALTER TABLE bazaar_hour_summary ADD COLUMN IF NOT EXISTS bid_up_price_delta double precision NOT NULL DEFAULT 0;
