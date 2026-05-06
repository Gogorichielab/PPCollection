# Claude Project Instructions — Pew Pew Collection

## What This File Is

This file gives Claude context about the Pew Pew Collection project so it can provide accurate, consistent, and useful assistance without needing to re-establish context each session. It supplements `AGENTS.md`, which contains broader agent guidelines and the principal-advisor role.

---

## Project Overview

**Pew Pew Collection** (repo: `PPCollection`) is a self-hosted, offline-first web application for managing a personal firearm inventory. It is free and open source under the GPL-3.0-or-later license, matching the project's `package.json` and `LICENSE` files.

**Always refer to this project as "Pew Pew Collection" — not "PPCollection" in conversation.**

The GitHub repository is at: `https://github.com/Gogorichielab/PPCollection`

The project version is managed in `package.json`; refer there for the current version.

---

## Core Values

These three principles drive every architectural and product decision:

- **Privacy** — All data stays on the user's machine. No cloud, no telemetry, no third-party services at runtime.
- **Offline-first** — The app runs with zero internet access. External API calls must always be opt-in and fail silently.
- **Self-hosted simplicity** — Users run one Docker command and own everything. Avoid adding external dependencies or account requirements.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js with Express.js v5 |
| Database | SQLite via `better-sqlite3` |
| Auth | Session-based, single admin user. Passwords hashed with `bcrypt` (cost 12). Forced password change on first login. |
| Sessions / cookies | `express-session` + `cookie-parser`; cookies are `httpOnly`, `sameSite=lax`, and `Secure` when `NODE_ENV=production` |
| CSRF | `csrf-csrf` double-submit cookie pattern (token in cookie + header/body) |
| Rate limiting | `express-rate-limit` on login (10 / 15 min, failed only) and password change (20 / 15 min) |
| HTTP hardening | `helmet` with default headers (CSP enabled), `method-override`, `morgan` for request logs |
| Frontend | Server-side rendering with EJS templates, plain CSS, vanilla JS in `src/public/js/`. No build step. |
| Deployment | Docker and Docker Compose; multi-arch image published to `ghcr.io/gogorichielab/ppcollection` |
| Versioning | Semantic Release with conventional commits |
| Testing | Jest + Supertest, run with `--runInBand` |
| Linting | ESLint flat config (`eslint.config.js`) |
| Node version | `>=20.0.0 <25.0.0` (`.nvmrc` pins v20; CI runs Node 22) |

---

## Architecture

Strict layered architecture — always respect these boundaries:

```
src/
├── server.js                 # Entry point — calls createApp() and listens
├── app/
│   ├── createApp.js          # App factory — wires middleware + routes + DI
│   ├── middleware/auth.js    # requireAuth + must-change-password redirect
│   └── routes/index.js       # Mounts feature routers
├── features/
│   ├── auth/                 # Login, change-password, profile, theme toggle
│   ├── firearms/             # Inventory CRUD, CSV import/export
│   └── home/                 # Dashboard
│       └── (each contains <feature>.controller.js,
│                            <feature>.routes.js,
│                            <feature>.service.js,
│                            <feature>.validators.js [if needed])
├── infra/
│   ├── config/index.js       # Reads + validates env vars; exports getConfig()
│   └── db/
│       ├── client.js         # better-sqlite3 connection
│       ├── migrate.js        # Numbered SQL migration runner (schema_migrations table)
│       ├── migrations/       # 001_initial_schema.sql, 002_settings_table.sql, 003_disposition_fields.sql
│       └── repositories/     # firearms.repository.js, settings.repository.js
├── services/
│   └── version.service.js    # Opt-in GitHub Releases lookup (UPDATE_CHECK)
├── shared/
│   └── utils/csv.js          # CSV parse + serialise
├── public/
│   ├── css/styles.css        # Single stylesheet, dark + light via [data-theme]
│   └── js/                   # search.js, theme.js, firearm-form.js, etc.
└── views/                    # EJS templates
    ├── partials/layout.ejs
    ├── auth/   firearms/   home/   errors/
    └── (each feature has a *.ejs page + *-content.ejs partial)
```

**Key rules:**
- Controllers handle HTTP only — delegate to services
- Services contain business logic — delegate to repositories
- Repositories do SQL only — no business logic
- No inline styles in EJS templates — use `styles.css`
- All mobile overrides go inside the existing `@media (max-width: 640px)` block in `styles.css`
- No frontend build step — no bundlers, no transpilers, no npm build script

---

## Database

- SQLite is the correct and intentional database choice — do not suggest replacing it
- Schema changes are new numbered SQL migration files in `src/infra/db/migrations/` (e.g. `004_*.sql`)
- The migration runner records applied files in a `schema_migrations` table; never modify or rename a migration that has already shipped
- `maintenance_logs` and `range_sessions` tables exist in `001_initial_schema.sql` but have no UI yet — intentional, reserved for future features
- Disposition fields (`disposition_name`, `disposition_address`, `disposition_date`, `disposition_reason`) were added in `003_*.sql` and are written/cleared based on `status` in `firearms.validators.js`
- The `settings` table is a key/value store used by `settings.repository.js` for: `username`, `password_hash`, `must_change_password`, `theme`, `update_check_enabled`

---

## Authentication & Security (current state)

These were on the old backlog and are now implemented — do **not** suggest re-adding them as new work:

- **Bcrypt password hashing** — `auth.service.js` uses `bcrypt.compare` / `bcrypt.hash` at cost 12. The plain `ADMIN_PASSWORD` env var is only used to seed the hash on first run.
- **First-run admin guard** — In production the app refuses to start if `ADMIN_PASSWORD` is unset or `changeme` and no hash exists yet.
- **Forced password change on first login** — `must_change_password` flag in settings; `requireAuth` redirects to `/change-password` until cleared.
- **CSRF protection** — `csrf-csrf` double-submit cookie. Token surfaced as `res.locals.csrfToken`; rejected requests render `errors/403.ejs`.
- **Rate limiting** — login (failed only) and password-change endpoints (see `auth.routes.js`).
- **Helmet defaults** — CSP is enabled (the old `contentSecurityPolicy: false` is gone).
- **Secure cookies** — Default `true` when `NODE_ENV=production`. `TRUST_PROXY=true` is required behind an HTTPS reverse proxy or sessions silently fail; the config layer warns on the misconfig.
- **`SESSION_SECRET` guard** — Production refuses to start if it equals the documented default.
- **Input validation** — `firearms.validators.js` enforces field length limits and numeric bounds; not just sanitization.
- **404 handling** — Both unmatched routes and missing firearms render `errors/404.ejs` (the old `res.send('Not found')` is gone).

---

## Current Backlog

### UI/UX
- Inventory table missing Status and Firearm Type columns
- Table rows not clickable — only the View button works
- Delete uses `window.confirm()` — needs a proper modal
- Page titles are all "Pew Pew Collection" regardless of page
- Add/edit form fields not grouped into sections like the detail view
- No flash message after saving a firearm

### Mobile
- Codex planning document exists covering: container padding, table overflow, form grid, tap targets, action bar stacking. Inventory rows already collapse to cards on mobile per the README.

### Features Planned
- Maintenance log UI (schema already exists)
- Range session tracking UI (schema already exists)
- Reporting & analytics dashboard (beyond current home charts)
- Photo attachments (stored locally in Docker volume)
- gun-db auto-fill — pre-populate make/model from the related `gun-db` dataset

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | HTTP port | `3000` |
| `SESSION_SECRET` | Session + CSRF cookie signing key. **Required in production.** | `ppcollection_dev_secret` |
| `ADMIN_USERNAME` | Admin login username | `admin` |
| `ADMIN_PASSWORD` | Initial admin password (hashed on first run). **Required for first-run in production.** | `changeme` |
| `DATABASE_PATH` | SQLite file location | `<cwd>/data/app.db` (Docker: `/data/app.db`) |
| `NODE_ENV` | `production` triggers stricter guards and secure-cookie defaults | unset |
| `TRUST_PROXY` | Honor `X-Forwarded-Proto` from a reverse proxy | `false` |
| `SECURE_COOKIES` | Force `Secure` flag on cookies | `true` when `NODE_ENV=production`, else `false` |
| `UPDATE_CHECK` | Opt-in GitHub Releases check (14-day cache) | `false` |

---

## Commit Convention

Semantic Release with conventional commits. Always use this format:

```
<type>(<scope>): <description>
```

| Type | Release | Use for |
|------|---------|---------|
| `feat` | minor | New features |
| `fix` | patch | Bug fixes |
| `style` | patch | CSS / formatting |
| `refactor` | patch | Restructuring without behaviour change |
| `perf` | patch | Performance improvements |
| `test` | patch | Tests |
| `docs` | patch | Documentation |
| `ci` | patch | CI/CD changes |
| `chore` | none | Maintenance |

Use `BREAKING CHANGE:` in the commit footer to trigger a major release.

---

## Testing & QA

| Tool | Purpose | Notes |
|------|---------|-------|
| Jest | Unit + integration | `--runInBand` is required (SQLite tests share a single process); enforced via npm scripts |
| Supertest | HTTP integration | Used in `tests/integration/*.test.js` |
| ESLint flat config | Lint | Rules include `eqeqeq` (with `null` exception), `prefer-const`, `no-var`, `no-throw-literal`, `no-return-await`, `no-implicit-coercion`, `no-param-reassign`, `prefer-template`, `object-shorthand`. Config in `eslint.config.js`. |
| Trivy + `.trivyignore.yaml` | Filesystem CVE scan in CI | Fails on HIGH/CRITICAL fixable issues; SARIF uploaded |
| `npm audit` | Runtime dep CVE check in CI | `--audit-level=high --omit=dev` |
| Hadolint | Dockerfile lint in CI | `failure-threshold: error`; suppress per-rule inline with `# hadolint ignore=…` |
| CodeQL | SAST | Configured via GitHub's default Code Scanning setup, not a workflow file in this repo |

**npm scripts:**
- `npm test` — fast unit + integration, no coverage
- `npm run test:unit` — unit only
- `npm run test:integration` — integration only
- `npm run test:ci` — what CI runs: `--coverage --ci`, gated by thresholds in `jest.config.js` (statements/lines/functions ≥ 90%, branches ≥ 75%)
- `npm run test:watch` — TDD loop
- `npm run lint` — ESLint over `src` and `tests`

When adding a test, prefer `tests/unit/` for pure-logic and a single repository, `tests/integration/` when you need the full Express app via Supertest. Keep `--runInBand` — SQLite + Jest will deadlock if you parallelize.

---

## GitHub Actions

Workflows in `.github/workflows/`:

- **`ci.yml`** — On every PR to `main`: lint, `npm run test:ci`, `npm audit --audit-level=high --omit=dev`, Trivy fs scan (HIGH/CRITICAL fixable, SARIF uploaded), Hadolint Dockerfile scan (`no-fail: false`, threshold `error`). Coverage report uploaded as an artifact.
- **`release.yml`** — On merge to `main`: semantic-release dry-run produces a release PR; once merged, builds and pushes the multi-arch Docker image to `ghcr.io/gogorichielab/ppcollection` and tags the GitHub release.
- **`maintenance.yml`** — Daily 04:00 UTC + workflow_dispatch. (1) `actions/stale@v9` marks issues stale after 60 days / PRs after 30, closes after 7. (2) Deletes `codex/*` and `copilot/*` branches whose PR was merged ≥ 2 days ago.

---

## Related Projects

**gun-db** — A forked and now independently maintained CC0 firearm reference dataset at `https://github.com/Gogorichielab/gun-db`. Originally from GunClear (abandoned). Being improved to serve as the data source for a future auto-fill feature in Pew Pew Collection where users can look up a make/model and have fields pre-populated. Data is JSON files structured as `{manufacturer}/{model}/{model-number}.json` with fields: caliber, barrel length, style, fire mode, and serial decoder.

---

## Monetization Plans

- Future premium license via one-time license key purchase
- Self-hosted model retained — no SaaS pivot for the core app
- License enforcement via `node-machine-id` style hardware binding
- Premium feature candidates: advanced reporting, photo attachments, multi-user support, automated backups

---

## What NOT to Suggest

- Replacing SQLite — it is the correct intentional choice
- Moving to Supabase or any cloud database for the core app (may be relevant for a future SaaS premium tier)
- Adding internet-dependent features that run at runtime without an opt-in env var
- Rewriting the stack — Node.js/Express is fine for this use case
- Bundlers, transpilers, or frontend frameworks — there is no build step by design
- Creating additional `@media` query blocks in CSS — use the existing one
- Adding inline styles to EJS templates
- Re-implementing already-shipped security work (bcrypt, CSRF, rate limiting, forced password change, CSP, input validation) — verify current state before proposing as new work

---

## Preferred Tone for This Project

The owner prefers direct, consultant-style answers. Ask clarifying questions before giving detailed answers. Keep responses concise and actionable. See `AGENTS.md` for the broader principal-architect / product-advisor role and deliverable formats.
