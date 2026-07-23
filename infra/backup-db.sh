#!/usr/bin/env bash
# Nightly Postgres backup for Modern Bazaar. Run from cron on the host:
#   0 4 * * * /path/to/infra/backup-db.sh >> /var/log/mb-backup.log 2>&1
# Keeps the last 14 daily dumps. RESTORE DRILL (do this once so you trust it):
#   gunzip -c backups/bazaar-YYYY-MM-DD.sql.gz | docker exec -i modernbazaar-db-1 psql -U bazaar -d bazaar_restore_test
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/backups}"
CONTAINER="${DB_CONTAINER:-modernbazaar-db-1}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y-%m-%d_%H%M)"
FINAL="$BACKUP_DIR/bazaar-$STAMP.sql.gz"
TEMP="$FINAL.tmp"

mkdir -p "$BACKUP_DIR"
trap 'rm -f "$TEMP"' EXIT
docker exec "$CONTAINER" pg_dump -U bazaar -d bazaar --no-owner | gzip > "$TEMP"
gzip -t "$TEMP"

# Sanity: a dump under 1KB means something went wrong; keep it but shout.
SIZE=$(stat -c%s "$TEMP" 2>/dev/null || stat -f%z "$TEMP")
if [ "$SIZE" -lt 1024 ]; then
  echo "ERROR: backup bazaar-$STAMP.sql.gz is suspiciously small ($SIZE bytes)" >&2
  exit 1
fi

mv "$TEMP" "$FINAL"
sha256sum "$FINAL" > "$FINAL.sha256"
trap - EXIT

# Rotate
find "$BACKUP_DIR" -name 'bazaar-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'bazaar-*.sql.gz.sha256' -mtime +"$KEEP_DAYS" -delete
echo "backup ok: bazaar-$STAMP.sql.gz ($SIZE bytes)"
