#!/usr/bin/env bash
# Restore the production SQLite database from R2 (via Litestream) to local data/ folder.
#
# Usage:
#   set -a && source .env && set +a && ./scripts/pull-db.sh
#
# Required env vars: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
# Requires: litestream (brew install litestream)

set -euo pipefail

LOCAL_DIR="packages/server/data"
LOCAL_PATH="$LOCAL_DIR/dak.db"
BACKUP_PATH="$LOCAL_DIR/dak.db.bak"

cd "$(dirname "$0")/.."

for var in R2_ENDPOINT R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌ $var is required" >&2
    exit 1
  fi
done

# Ensure local data dir exists
mkdir -p "$LOCAL_DIR"

# Remove WAL/SHM files that would conflict with restore
rm -f "$LOCAL_PATH-wal" "$LOCAL_PATH-shm"

# Back up existing local db if present
if [[ -f "$LOCAL_PATH" ]]; then
  echo "⏳ Backing up existing local db → $BACKUP_PATH"
  mv "$LOCAL_PATH" "$BACKUP_PATH"
fi

echo "⏳ Restoring from R2 …"

# Generate temp litestream config (reuses production litestream.yml structure)
TMPCONF=$(mktemp)
trap 'rm -f "$TMPCONF"' EXIT
cat > "$TMPCONF" <<EOF
dbs:
  - path: $LOCAL_PATH
    replicas:
      - type: s3
        bucket: dak-backup
        path: dak.db
        endpoint: $R2_ENDPOINT
        access-key-id: $R2_ACCESS_KEY_ID
        secret-access-key: $R2_SECRET_ACCESS_KEY
EOF

litestream restore -config "$TMPCONF" "$LOCAL_PATH"

echo "✅ Database restored to $LOCAL_PATH ($(du -h "$LOCAL_PATH" | cut -f1))"
