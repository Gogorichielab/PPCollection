# Database

PPCollection uses SQLite (`better-sqlite3`).

## Startup behavior

- DB file path comes from `DATABASE_PATH`.
- On startup, `migrate(db)` ensures:
  - `schema_migrations` exists.
  - SQL migrations in `src/infra/db/migrations/*.sql` are applied once.
  - Legacy firearms columns (`location`, `gun_warranty`, `firearm_type`) exist for older databases.

## Current schema

Primary tables:

- `firearms`
- `maintenance_logs`
- `range_sessions`
- `schema_migrations`

Migration files should be append-only and named with sortable prefixes (for example `002_add_example.sql`).
