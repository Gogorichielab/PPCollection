#!/usr/bin/env sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$PROJECT_ROOT"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "Error: docker compose or docker-compose is required." >&2
  exit 1
fi

SERVICE="${PPC_SERVICE_NAME:-ppcollection}"
DATABASE_PATH="${PPC_DATABASE_PATH:-/data/app.db}"
CONTAINER_BACKUP_DIR="${PPC_CONTAINER_BACKUP_DIR:-/data/backups}"
HOST_BACKUP_DIR="${PPC_HOST_BACKUP_DIR:-$PROJECT_ROOT/data/backups}"

mkdir -p "$HOST_BACKUP_DIR"

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_FILE="app-${TIMESTAMP}.db"
CONTAINER_BACKUP_PATH="${CONTAINER_BACKUP_DIR}/${BACKUP_FILE}"
HOST_BACKUP_PATH="${HOST_BACKUP_DIR}/${BACKUP_FILE}"

if ! $COMPOSE ps --status running --services 2>/dev/null | grep -Fxq "$SERVICE"; then
  echo "Error: service '$SERVICE' is not running. Start the stack before backing up." >&2
  exit 1
fi

$COMPOSE exec -T "$SERVICE" node -e "const Database=require('better-sqlite3');(async()=>{const db=new Database(process.env.PPC_DATABASE_PATH||'$DATABASE_PATH',{readonly:true});try{await db.backup('$CONTAINER_BACKUP_PATH');}finally{db.close();}})().catch((error)=>{console.error(error);process.exit(1);});"

$COMPOSE exec -T "$SERVICE" node -e "const Database=require('better-sqlite3');const db=new Database('$CONTAINER_BACKUP_PATH',{readonly:true});try{const check=db.pragma('integrity_check',{simple:true});if(check!=='ok'){console.error('Integrity check failed:',check);process.exit(1);}console.log('integrity_check=ok');}finally{db.close();}"

echo "Backup created: ${HOST_BACKUP_PATH}"
