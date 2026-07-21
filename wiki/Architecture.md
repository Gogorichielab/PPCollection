# Architecture

Pew Pew Collection is a single-process Node.js / Express app rendering EJS
server-side, backed by SQLite. There is no build step, no bundler, no
frontend framework.

## Layered structure

```
src/
├── server.js                 # Entry point — calls createApp() and listens
├── app/
│   ├── createApp.js          # App factory — wires middleware + routes + DI
│   ├── middleware/auth.js    # requireAuth + must-change-password redirect
│   └── routes/index.js       # Mounts feature routers
├── features/
│   ├── auth/                 # Login, change-password, profile, theme toggle
│   ├── firearms/             # Inventory CRUD, CSV import/export, insurance report
│   ├── home/                 # Dashboard (activity feed, charts, cleaning-due list)
│   ├── maintenance/          # Per-firearm maintenance log + cleaning-due rule
│   ├── photos/               # Per-firearm photo attachments (multer, /data/photos)
│   ├── range-sessions/       # Per-firearm range session log with running totals
│   └── reports/              # Analytics dashboard (charts, trends, disposition stats)
│       └── (each contains <feature>.controller.js,
│                            <feature>.routes.js,
│                            <feature>.service.js,
│                            <feature>.validators.js [if needed])
├── infra/
│   ├── config/index.js       # Reads + validates env vars; exports getConfig() (incl. dataDir/photosDir)
│   └── db/
│       ├── client.js         # better-sqlite3 connection
│       ├── migrate.js        # Numbered SQL migration runner (schema_migrations table)
│       ├── migrations/       # 001_initial_schema.sql … 008_log_indexes.sql
│       └── repositories/     # firearms, settings, maintenance, range-sessions, photos, reports
├── services/
│   ├── version.service.js    # Opt-in GitHub Releases lookup (UPDATE_CHECK)
│   └── audit.service.js      # Structured audit events (stdout JSON)
├── shared/
│   └── utils/
│       ├── csv.js            # CSV parse + serialise
│       └── dates.js          # Strict ISO date validation
├── public/
│   ├── css/styles.css        # Single stylesheet, dark + light via [data-theme]
│   └── js/                   # search.js, theme.js, firearm-form.js, firearm-photos.js, etc.
└── views/                    # EJS templates
    ├── partials/layout.ejs
    ├── auth/   firearms/   home/   errors/   reports/
    └── (each feature has a *.ejs page + *-content.ejs partial)
```

## Layer rules

- **Controllers** handle HTTP only and delegate to services.
- **Services** contain business logic and delegate to repositories.
- **Repositories** do SQL only — no business logic.
- **Views** render EJS only; no inline styles (everything in `styles.css`),
  and all mobile overrides go inside the existing `@media (max-width: 640px)`
  block.

## Request lifecycle

1. `server.js` calls `createApp()` and binds the HTTP server.
2. `createApp()` wires middleware: `helmet`, `cookie-parser`,
   `express-session`, `csrf-csrf`, `morgan`, `method-override`, and
   feature routers.
3. A request to e.g. `GET /firearms/:id` hits the route in
   `features/firearms/firearms.routes.js`, which calls the controller.
4. The controller validates inputs via `firearms.validators.js`, calls
   `firearms.service.js`, and renders an EJS view.
5. The service calls `firearms.repository.js`, which runs a parameterized
   SQL statement against the SQLite database.
6. The response renders `views/firearms/<view>.ejs` inside
   `partials/layout.ejs`.

## Database

- SQLite via `better-sqlite3` — synchronous, fast, single-file.
- Schema changes are new numbered SQL migration files in
  `src/infra/db/migrations/` (e.g. `009_*.sql`).
- The migration runner records applied files in a `schema_migrations` table;
  shipped migrations are immutable.
- `settings` is a key/value table holding `username`, `password_hash`,
  `must_change_password`, `theme`, `update_check_enabled`,
  `maintenance_due_days`.
- `maintenance_logs` and `range_sessions` back the maintenance log and range
  session sections on the firearm detail page; ownership is checked through
  the parent firearm (neither table has a `user_id` column).
- `firearm_photos` (migration `007`) stores photo metadata; image files live
  under `<dataDir>/photos` (Docker: `/data/photos`) with server-generated
  filenames and are served only through an authenticated, ownership-checked
  route. Uploads are capped at 12 photos per firearm, 10 MB per file.
  Accepted formats: JPEG, PNG, WebP, GIF.

## Technology stack

| Layer | Technology |
|---|---|
| Runtime | Node.js >=20.0.0 <25.0.0 |
| HTTP | Express.js v5 |
| Templating | EJS, server-side rendered |
| Database | SQLite via `better-sqlite3` |
| Auth | Session-based, single admin, bcrypt cost 12 |
| Sessions | `express-session` + `cookie-parser` |
| CSRF | `csrf-csrf` double-submit cookie |
| Rate limiting | `express-rate-limit` |
| HTTP hardening | `helmet` with CSP enabled |
| Logging | `morgan` for requests, structured JSON for audit |
| Frontend assets | Plain CSS + vanilla JS in `src/public/`, no build step |
| Testing | Jest + Supertest, `--runInBand` |
| Linting | ESLint flat config |

## CI

- `ci.yml` — runs on every PR: lint, `npm run test:ci`, `npm audit`, Trivy
  filesystem scan, Hadolint Dockerfile scan, coverage upload.
- `release.yml` — runs on merge to `main`: semantic-release builds and pushes
  the multi-arch Docker image to GHCR and tags the GitHub release.
- `maintenance.yml` — daily at 04:00 UTC: stale-bot for issues / PRs, deletes
  merged `codex/*` and `copilot/*` branches after 2 days.
