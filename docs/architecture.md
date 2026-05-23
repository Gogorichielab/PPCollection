# Architecture

PPCollection is organized by layer and feature to keep HTTP handling, business logic, and persistence isolated.

## Directory layout

```
src/
├── server.js                     # Entry point — loads config and starts HTTP server
├── app/
│   ├── createApp.js              # App factory — initialises DB, wires all layers
│   ├── middleware/
│   │   └── auth.js               # requireAuth middleware applied per route
│   └── routes/
│       └── index.js              # Mounts all feature routers
├── features/
│   ├── auth/
│   │   ├── auth.controller.js    # Login, logout, change-password, profile actions
│   │   ├── auth.routes.js        # /login, /logout, /change-password, /profile, /toggle-theme
│   │   └── auth.service.js       # bcrypt hashing, session, username, theme management
│   ├── firearms/
│   │   ├── firearms.controller.js # Inventory CRUD, CSV export, CSV import
│   │   ├── firearms.routes.js     # /firearms, /firearms/:id, /firearms/export, /firearms/import, …
│   │   ├── firearms.service.js    # Business logic, CSV generation, CSV parsing
│   │   └── firearms.validators.js # Input sanitization, field validation, serial uniqueness
│   ├── home/
│   │   ├── home.controller.js    # Dashboard view
│   │   ├── home.routes.js        # / (dashboard)
│   │   └── home.service.js       # Collection stats, activity feed, chart data
│   └── reports/
│       ├── reports.controller.js  # Analytics dashboard view
│       ├── reports.routes.js      # /reports
│       └── reports.service.js     # Report queries: summary, charts, disposition stats
├── infra/
│   ├── config/
│   │   └── index.js              # Environment variable config (PORT, SESSION_SECRET, …)
│   └── db/
│       ├── client.js             # better-sqlite3 connection
│       ├── migrate.js            # SQL migration runner + legacy column guards
│       ├── migrations/
│       │   ├── 001_initial_schema.sql    # firearms, maintenance_logs, range_sessions
│       │   ├── 002_settings_table.sql    # settings key/value store
│       │   ├── 003_disposition_fields.sql # disposition_name/address/date/reason columns
│       │   ├── 004_add_user_id.sql       # user_id column on firearms (multi-user prep)
│       │   ├── 005_add_indexes.sql       # Performance indexes on status, condition, type, make+model
│       │   └── 006_serial_unique_index.sql # Partial unique index on serial number
│       └── repositories/
│           ├── firearms.repository.js  # SQL for inventory CRUD, pagination, charts (scoped by user_id)
│           ├── reports.repository.js   # SQL for analytics: summaries, breakdowns, trends
│           └── settings.repository.js  # SQL for key/value settings
├── services/
│   └── version.service.js        # GitHub Releases version check (cached, opt-in)
├── shared/
│   └── utils/
│       └── csv.js                # CSV escaping utility
└── views/                        # EJS templates (server-side rendered)
    ├── partials/
    │   └── layout.ejs            # Shared HTML shell, nav, theme injection
    ├── auth/                     # login.ejs, change-password.ejs, profile.ejs
    ├── errors/                   # 403.ejs, 404.ejs
    ├── firearms/                 # index.ejs, show.ejs, new.ejs, edit.ejs, import.ejs
    ├── home/                     # index.ejs, index-content.ejs
    └── reports/                  # index.ejs, index-content.ejs
```

## Request flow

1. `src/server.js` reads `getConfig()` and calls `createApp()`.
2. `src/app/createApp.js` runs `migrate(db)`, wires repositories → services → controllers → routes.
3. Feature route modules (`auth.routes.js`, `firearms.routes.js`, `home.routes.js`, `reports.routes.js`) map URLs to controller methods. `requireAuth` middleware is applied per route handler inside each feature's route file, not globally.
4. Controllers handle HTTP concerns only (parse query/body, call service, redirect or render).
5. Services contain business logic; they call repositories and shared utilities.
6. Repositories execute SQL queries and return plain objects — no logic.

## Authentication flow

| Step | What happens |
|------|-------------|
| First start | `initializePasswordHash` stores a bcrypt hash (cost 12) of `ADMIN_PASSWORD` in `settings` and sets `must_change_password = 1`. |
| Login | `validateCredentials` checks username and runs `bcrypt.compare`. Session gets `req.session.user = { id, username }`. |
| First login | Controller checks `mustChangePassword()` → redirects to `/change-password` before any other page. |
| Change password | 12-character minimum enforced; new hash written to `settings`; `must_change_password` set to `0`. |
| Subsequent requests | `requireAuth` middleware checks `req.session.user`; redirects to `/login` if absent. |
| Theme | Stored in `settings` table (`theme = dark | light`); injected into every response via `res.locals.theme`. |

## Database flow

1. Connection is opened in `src/infra/db/client.js` using **better-sqlite3** (synchronous SQLite).
2. `migrate(db)` applies numbered `.sql` files in `migrations/` in order, guarded by `IF NOT EXISTS`.
3. Repositories in `src/infra/db/repositories/` encapsulate all SQL. No SQL exists outside this directory.

## Database schema

### `firearms` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `user_id` | INTEGER NOT NULL | Default 1; scopes records per user (multi-user prep) |
| `make` | TEXT NOT NULL | Required |
| `model` | TEXT NOT NULL | Required |
| `serial` | TEXT | Optional; unique per user when non-empty (partial unique index) |
| `caliber` | TEXT | Optional |
| `purchase_date` | TEXT | ISO 8601 (YYYY-MM-DD) |
| `purchase_price` | REAL | Dollars |
| `condition` | TEXT | New / Used / Broken |
| `location` | TEXT | Free-text storage location |
| `status` | TEXT | Active / Sold / Lost\/Stolen / Under Repair |
| `disposition_name` | TEXT | Transferee name (shown when status is Sold or Lost/Stolen) |
| `disposition_address` | TEXT | Transferee address |
| `disposition_date` | TEXT | ISO 8601 date of disposition |
| `disposition_reason` | TEXT | Free-text reason for disposition |
| `notes` | TEXT | Free-text notes |
| `gun_warranty` | INTEGER | 0 = No, 1 = Yes |
| `firearm_type` | TEXT | Pistol / Rifle / Shotgun / Revolver / Other |
| `created_at` | TEXT | datetime('now') default |
| `updated_at` | TEXT | datetime('now') default, updated on edit |

### `settings` table

| Key | Purpose |
|-----|---------|
| `username` | Admin display name (editable on profile page) |
| `password_hash` | bcrypt hash (cost 12) |
| `must_change_password` | `1` if forced change required on next login |
| `theme` | `dark` or `light` — persisted server-side |
| `update_check_enabled` | `1` if the user has opted in to update notifications (only settable when `UPDATE_CHECK=true` at the server level) |

### Reserved tables (no UI yet)

`maintenance_logs` and `range_sessions` are created in `001_initial_schema.sql` with foreign keys to `firearms.id`. They are reserved for a future maintenance and range-session tracking feature.

## CSRF protection

Double-submit cookie pattern via `csrf-csrf`. Every state-mutating form includes a hidden `_csrf` field. The token is generated per session and injected into `res.locals.csrfToken` for EJS templates.

## Pagination

Inventory list paginates at 25 items per page via `firearmsRepository.paginate(page, perPage)`. The controller reads `?page=` from the query string and passes pagination metadata to the view.

## CSV export and import

### Export

`GET /firearms/export` calls `firearmsService.list()` (all records, no pagination) then `firearmsService.toCsv()` which delegates to `shared/utils/csv.js`. Response headers set `Content-Disposition: attachment; filename="firearms-<date>.csv"`. Disposition fields (`disposition_name`, `disposition_address`, `disposition_date`, `disposition_reason`) are included in the output but are only populated for records whose status is Sold or Lost/Stolen.

### Import

`GET /firearms/import` renders the import UI. `GET /firearms/import/template` returns a blank CSV containing only the header row so users can fill it in locally. `POST /firearms/import` accepts `text/plain` (up to 2 MB), parses the CSV with `parseCsv` from `shared/utils/csv.js`, validates each row through the same `validateFirearmInput` pipeline used by the UI form, and inserts valid rows. The response is JSON: `{ imported, failed, errors: [{ row, errors }] }`.

The expected column headers (case-insensitive) match the export format:

```
Make, Model, Serial, Caliber, Purchase Date, Purchase Price, Condition, Location,
Status, Disposition Name, Disposition Address, Disposition Date, Disposition Reason,
Firearm Type, Gun Warranty, Notes
```

## Update notifications

`src/services/version.service.js` polls the GitHub Releases API (`GET https://api.github.com/repos/Gogorichielab/PPCollection/releases/latest`) to compare the running version against the latest published release. Results are cached in memory for 14 days to minimize outbound requests.

The feature is **opt-in** and disabled by default:
- **Server level:** set `UPDATE_CHECK=true` in the environment. When disabled, `versionInfo` always returns `{ updateAvailable: false }` and no network requests are made.
- **User level:** when the server has `UPDATE_CHECK=true`, each user can additionally toggle the in-app notification banner via the Preferences section of their Profile page. The preference is stored in the `settings` table as `update_check_enabled`.

`res.locals.versionInfo` is populated by `createApp.js` middleware on every request and is available to all EJS templates.

## Reports & analytics

`GET /reports` renders a dedicated analytics dashboard backed by `reports.service.js` and `reports.repository.js`. The page displays:

| Widget | Data source |
|--------|-------------|
| Collection summary | Total firearms, total value, counts by status (active, sold, lost, repair, in-transit) |
| By type chart | Pie/bar breakdown of firearm types |
| By caliber chart | Top 15 calibers by count |
| By make chart | Top 15 manufacturers by count |
| By condition chart | Breakdown by condition field |
| Acquisition trend | Monthly acquisition count over time |
| Avg price by year | Average purchase price grouped by year |
| Disposition stats | Disposed count, total proceeds, average hold days |

All queries are scoped by `user_id` and the page shows an empty-state message when the collection is empty.

## Performance indexes

Migration 005 adds non-unique indexes to support filtered queries without full-table scans:

| Index | Column(s) | Purpose |
|-------|-----------|---------|
| `idx_firearms_status` | `status` | Status filter on inventory list |
| `idx_firearms_condition` | `condition` | Condition filter |
| `idx_firearms_firearm_type` | `firearm_type` | Type filter |
| `idx_firearms_make_model` | `make, model` | Sort/search by manufacturer |

## Serial number uniqueness

Migration 006 creates a partial unique index:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_firearms_serial_unique
ON firearms (serial) WHERE serial IS NOT NULL AND serial != '';
```

The service layer (`firearms.service.js`) additionally validates uniqueness before insert/update and during CSV import (intra-batch deduplication). Duplicate serial errors are surfaced to the user via inline form validation.
