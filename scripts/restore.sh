#!/usr/bin/env sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$PROJECT_ROOT"

if [ "${1:-}" = "" ]; then
  echo "Usage: scripts/restore.sh /path/to/backup.db" >&2
  exit 1
fi

BACKUP_SOURCE="$1"
if [ ! -f "$BACKUP_SOURCE" ]; then
  echo "Error: backup file not found: $BACKUP_SOURCE" >&2
  exit 1
fi

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "Error: docker compose or docker-compose is required." >&2
  exit 1
fi

SERVICE="${PPC_SERVICE_NAME:-ppcollection}"
DATA_DIR="${PPC_DATA_DIR:-$PROJECT_ROOT/data}"
TARGET_DB="${PPC_TARGET_DB:-$DATA_DIR/app.db}"
DATABASE_PATH="${PPC_DATABASE_PATH:-/data/app.db}"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)

mkdir -p "$DATA_DIR"

echo "Stopping stack..."
$COMPOSE down

if [ -f "$TARGET_DB" ]; then
  BROKEN_PATH="${TARGET_DB}.broken-${TIMESTAMP}"
  mv "$TARGET_DB" "$BROKEN_PATH"
  echo "Current database moved to ${BROKEN_PATH}"
fi

cp "$BACKUP_SOURCE" "$TARGET_DB"
echo "Restored backup to ${TARGET_DB}"

echo "Starting stack..."
$COMPOSE up -d

$COMPOSE exec -T "$SERVICE" node -e "const Database=require('better-sqlite3');const db=new Database(process.env.DATABASE_PATH||'$DATABASE_PATH',{readonly:true});try{const check=db.pragma('integrity_check',{simple:true});if(check!=='ok'){console.error('Integrity check failed after restore:',check);process.exit(1);}console.log('integrity_check=ok');}finally{db.close();}"
