# Database practices

The database holds paying customers' subscriptions. Losing it is not an
option. These are the rules, born from a real incident (see below).

## The rules

1. **Schema changes go through Flyway** (re-enabled July 2026, migrations in
   `core/src/main/resources/db/migration`). Write a `V<next>__description.sql`
   for every schema change. Make migrations idempotent where cheap
   (`IF NOT EXISTS`) so hand-patched environments converge.
2. **New NOT NULL columns MUST have a DEFAULT** in the migration. Hibernate
   `ddl-auto: update` (still on as a safety net) silently fails to add
   NOT NULL columns to populated tables; the app then crashes at the first
   query that touches the column. This took dev down on
   `bazaar_hour_summary.bid_up_moves` (fixed by `V5`).
3. **Additive first.** Add columns/tables in one deploy; only drop or rename in
   a later deploy after the old code is gone. Never destructive DDL in the same
   release that stops using the thing.
4. **Backups**: `infra/backup-db.sh` (pg_dump, gzip, 14-day rotation). Cron it
   nightly on the prod host and do ONE restore drill so the backup is known
   good; an untested backup is a hope, not a backup.
5. **Volumes**: Postgres data lives in the named volume `dbdata`. Compose
   recreates and image rebuilds do NOT touch it. `docker compose down -v`
   DELETES it - never pass `-v` anywhere near prod, and think twice in dev.
6. **Before every deploy**: check whether the release adds entity fields; if
   yes, confirm the matching migration exists. After deploy: check
   `flyway_schema_history` (`success = t` on the new row) and hit
   `/actuator/health`.

## Current state

- Flyway enabled, baseline v1 + V2-V4 historical, V5 adds the bid_up columns.
- `ddl-auto: update` remains ON as a transition net. Once a few releases pass
  with Flyway-only changes, flip it to `validate` so schema drift fails loudly
  at boot instead of silently at query time.

## The incident this file exists because of (July 2026)

The manipulation feature added `bidUpMoves`/`bidUpPriceDelta` as NOT NULL
entity fields with no migration. Fresh-looking environments worked (hibernate
created the columns with the table); the long-lived dev DB did not (table had
rows, ALTER silently skipped), and core crash-looped at boot on the first
native query. Ten minutes of diagnosis, one ALTER to fix, and it would have
been a prod outage.
