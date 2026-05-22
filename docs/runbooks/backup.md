# Backup and restore runbook

This runbook covers safe SQLite backup and restore for Pew Pew Collection when running with Docker Compose.

## Why this matters

Pew Pew Collection stores all inventory data in one SQLite database (`/data/app.db`). If that file is deleted or corrupted, your records are lost unless you have a verified backup.

Do **not** use `cp data/app.db ...` against a running WAL-mode database. Use the provided script so SQLite creates a consistent snapshot.

## Prerequisites

- Docker Compose deployment (`docker compose` or `docker-compose`)
- App running with a bind mount to `./data:/data`
- Repository scripts:
  - `scripts/backup.sh`
  - `scripts/restore.sh`

## Create a backup (live-safe)

From the project root:

```bash
./scripts/backup.sh
```

What it does:

1. Connects to the running `ppcollection` container.
2. Uses `better-sqlite3` online backup API to snapshot `/data/app.db`.
3. Writes backup to `/data/backups/app-<UTC timestamp>.db` (host path: `./data/backups/...`).
4. Runs `PRAGMA integrity_check` against the backup and fails if the result is not `ok`.

## Verify a backup manually

You can verify any backup file from inside the container:

```bash
docker compose exec -T ppcollection node -e "const Database=require('better-sqlite3');const db=new Database('/data/backups/app-YYYYMMDDTHHMMSSZ.db',{readonly:true});console.log(db.pragma('integrity_check',{simple:true}));db.close();"
```

Expected output:

```text
ok
```

## Restore from a backup

Run restore from the project root:

```bash
./scripts/restore.sh /absolute/path/to/backup.db
```

What it does:

1. Stops the stack (`docker compose down`).
2. Moves current DB to `data/app.db.broken-<UTC timestamp>` (if present).
3. Copies the provided backup to `data/app.db`.
4. Starts the stack (`docker compose up -d`).
5. Runs `PRAGMA integrity_check` on the restored DB and fails if not `ok`.

## Suggested schedule and retention

Daily backup with 14-day retention:

```cron
0 3 * * * cd /path/to/PPCollection && ./scripts/backup.sh && find data/backups -type f -name 'app-*.db' -mtime +14 -delete
```

Store a second copy off-host (Borg, restic, rsync, NAS, external disk). Local-only backups do not protect against host loss.

## Restore from Borg/restic/rsync archives

1. Extract one verified `app-*.db` backup file from your archive to a temporary path.
2. Run `./scripts/restore.sh /path/to/extracted-backup.db`.
3. Log in and spot-check recent records (especially latest changes before incident).
4. Keep `data/app.db.broken-<timestamp>` until you finish validation.

## Migrate to a new host safely

1. On current host, run `./scripts/backup.sh`.
2. Copy **either**:
   - The full `data/` directory, or
   - The latest verified `data/backups/app-*.db` plus your `.env`/compose config.
3. On new host, deploy the same Pew Pew Collection version and compose config.
4. If restoring from backup file, run `./scripts/restore.sh /path/to/app-*.db`.
5. Verify app health and inventory data.

## Operational notes

- Test restore at least quarterly; untested backups are high-risk.
- Keep enough free disk space in `data/backups`.
- Treat backup files as sensitive data (serial numbers, purchase details, notes). Encrypt off-host storage.
