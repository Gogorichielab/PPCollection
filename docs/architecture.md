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
│   │   ├── firearms.controller.js # Inventory CRUD, CSV export
│   │   ├── firearms.routes.js     # /firearms, /firearms/:id, /firearms/export, …
│   │   ├── firearms.service.js    # Business logic, CSV generation
│   │   └── firearms.validators.js # Input sanitization and required-field validation
│   └── home/
│       ├── home.controller.js    # Dashboard view
│       ├── home.routes.js        # / (dashboard)
│       └── home.service.js       # Collection stats, activity feed, chart data
├── infra/
│   ├── config/
│   │   └── index.js              # Environment variable config (PORT, SESSION_SECRET, …)
│   └── db/
│       ├── client.js             # better-sqlite3 connection
│       ├── migrate.js            # SQL migration runner + legacy column guards
│       ├── migrations/
│       │   ├── 001_initial_schema.sql  # firearms, maintenance_logs, range_sessions
│       │   └── 002_settings_table.sql  # settings key/value store
│       └── repositories/
│           ├── firearms.repository.js  # SQL for inventory CRUD, pagination, charts
│           └── settings.repository.js  # SQL for key/value settings
├── shared/
│   └── utils/
│       └── csv.js                # CSV escaping utility
└── views/                        # EJS templates (server-side rendered)
    ├── partials/
    │   └── layout.ejs            # Shared HTML shell, nav, theme injection
    ├── auth/                     # login.ejs, change-password.ejs
    ├── errors/                   # 404.ejs
    ├── firearms/                 # index.ejs, show.ejs, new.ejs, edit.ejs
    └── home/                     # index.ejs, index-content.ejs
```

## Request flow

1. `src/server.js` reads `getConfig()` and calls `createApp()`.
2. `src/app/createApp.js` runs `migrate(db)`, wires repositories → services → controllers → routes.
3. Feature route modules (`auth.routes.js`, `firearms.routes.js`, `home.routes.js`) map URLs to controller methods. `requireAuth` middleware is applied per route handler inside each feature's route file, not globally.
4. Controllers handle HTTP concerns only (parse query/body, call service, redirect or render).
5. Services contain business logic; they call repositories and shared utilities.
6. Repositories execute SQL queries and return plain objects — no logic.

## Authentication flow

| Step | What happens |
|------|-------------|
| First start | `initializePasswordHash` stores a bcrypt hash (cost 12) of `ADMIN_PASSWORD` in `settings` and sets `must_change_password = 1`. |
| Login | `validateCredentials` checks username and runs `bcrypt.compare`. Session gets `req.session.user = username`. |
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
| `make` | TEXT NOT NULL | Required |
| `model` | TEXT NOT NULL | Required |
| `serial` | TEXT | Optional |
| `caliber` | TEXT | Optional |
| `purchase_date` | TEXT | ISO 8601 (YYYY-MM-DD) |
| `purchase_price` | REAL | Dollars |
| `condition` | TEXT | New / Used / Broken |
| `location` | TEXT | Free-text storage location |
| `status` | TEXT | Active / Sold / Lost\/Stolen / Under Repair |
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

### Reserved tables (no UI yet)

`maintenance_logs` and `range_sessions` are created in `001_initial_schema.sql` with foreign keys to `firearms.id`. They are reserved for a future maintenance and range-session tracking feature.

## CSRF protection

Double-submit cookie pattern via `csrf-csrf`. Every state-mutating form includes a hidden `_csrf` field. The token is generated per session and injected into `res.locals.csrfToken` for EJS templates.

## Pagination

Inventory list paginates at 25 items per page via `firearmsRepository.paginate(page, perPage)`. The controller reads `?page=` from the query string and passes pagination metadata to the view.

## CSV export

`GET /firearms/export` calls `firearmsService.list()` (all records, no pagination) then `firearmsService.toCsv()` which delegates to `shared/utils/csv.js`. Response headers set `Content-Disposition: attachment; filename="firearms.csv"`.
