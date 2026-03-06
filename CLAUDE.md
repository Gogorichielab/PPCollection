# Claude Project Instructions — Pew Pew Collection

## What This File Is

This file gives Claude context about the Pew Pew Collection project so it can provide accurate, consistent, and useful assistance without needing to re-establish context each session.

---

## Project Overview

**Pew Pew Collection** (repo: `PPCollection`) is a self-hosted, offline-first web application for managing a personal firearm inventory. It is free and open source under the GPL-3.0-or-later license, matching the project's package.json and LICENSE files.

**Always refer to this project as "Pew Pew Collection" — not "PPCollection" in conversation.**

The GitHub repository is at: `https://github.com/Gogorichielab/PPCollection`

The project is at **v1.8.2** as of the last session.

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
| Database | SQLite via better-sqlite3 |
| Auth | Session-based, single admin user |
| Security | Helmet, express-session |
| Frontend | Server-side rendering with EJS templates |
| Deployment | Docker and Docker Compose |
| Versioning | Semantic Release with conventional commits |
| Testing | Jest with Supertest |
| Node version | >=20.0.0 <24.0.0 (pinned via .nvmrc to v20) |

---

## Architecture

Strict layered architecture — always respect these boundaries:

```
src/
├── app/
│   ├── createApp.js          # App factory
│   ├── middleware/           # Express middleware (auth)
│   └── routes/               # Route registration
├── features/
│   └── <feature>/
│       ├── <feature>.controller.js   # HTTP only — no business logic
│       ├── <feature>.routes.js
│       ├── <feature>.service.js      # Business logic only
│       └── <feature>.validators.js   # Input sanitization
├── infra/
│   ├── config/               # Environment config
│   └── db/
│       ├── client.js
│       ├── migrate.js
│       ├── migrations/       # Numbered SQL files e.g. 001_*.sql
│       └── repositories/     # SQL only — no business logic
├── services/                 # Shared services (e.g. version.service.js)
├── shared/                   # Shared utilities (e.g. csv.js)
└── views/                    # EJS templates
    ├── partials/layout.ejs
    └── <feature>/
```

**Key rules:**
- Controllers handle HTTP only — delegate to services
- Services contain business logic — delegate to repositories
- Repositories do SQL only — no business logic
- No inline styles in EJS templates — use `styles.css`
- All mobile overrides go inside the existing `@media (max-width: 640px)` block in `styles.css`

---

## Database

- SQLite is the correct and intentional database choice — do not suggest replacing it
- All schema changes must be new numbered SQL migration files in `src/infra/db/migrations/`
- Never modify existing migration files
- `ensureLegacyColumns` in `migrate.js` is a known code smell being phased out — do not add to it
- `maintenance_logs` and `range_sessions` tables exist in the schema but have no UI yet — intentional, reserved for future features

---

## Current Known Issues & Backlog

### Security (highest priority)
- Plain text password storage — needs bcrypt migration (story written)
- `contentSecurityPolicy: false` in Helmet config — needs proper CSP
- Session cookie missing `secure: true` and `httpOnly: true`
- Force password change on first login — full story and Codex plan written

### Code Quality
- `ensureLegacyColumns` should be replaced with a proper SQL migration file
- `res.status(404).send('Not found')` in firearms controller should render the 404 view
- No input validation beyond sanitization — make and model should be validated
- No ESLint configured (`npm run lint` is a no-op)

### UI/UX
- Inventory table missing Status and Firearm Type columns
- Table rows not clickable — only the View button works
- Delete uses `window.confirm()` — needs a proper modal
- Page titles are all "Pew Pew Collection" regardless of page
- Add/edit form fields not grouped into sections like the detail view
- No flash message after saving a firearm
- Filtered item count doesn't update dynamically
- Notes field overflows its card on the detail page — Codex plan written
- Serial numbers get clipped in the detail grid — Codex plan written

### Mobile
- Full Codex planning document written covering: container padding, table overflow, form grid, tap targets, and action bar stacking

### Features Planned
- Maintenance log UI (schema already exists)
- Range session tracking UI (schema already exists)
- Reporting & analytics dashboard
- Photo attachments (stored locally in Docker volume)
- User profile page (username, password, dark mode preference)
- Version update indicator (opt-in via `UPDATE_CHECK=true` env var) — full Codex plan written
- Pagination for large collections

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | HTTP port | `3000` |
| `SESSION_SECRET` | Session signing key | `ppcollection_dev_secret` |
| `ADMIN_USERNAME` | Admin login | `admin` |
| `ADMIN_PASSWORD` | Admin password (plain text — bcrypt migration pending) | `changeme` |
| `DATABASE_PATH` | SQLite file location | `<project>/data/app.db` |
| `UPDATE_CHECK` | Enable GitHub release checks | `false` |

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
| `test` | patch | Tests |
| `docs` | patch | Documentation |
| `chore` | none | Maintenance |

---

## GitHub Actions

The following workflows are in place (updated versions produced in last session):

- `ci.yml` — Lint and test on all PRs. Uses `actions/setup-node` to pin Node version, npm caching enabled.
- `release.yml` — Semantic release + Docker build and push to `ghcr.io/gogorichielab/ppcollection` on merge to main
- `hadolint.yml` — Dockerfile linting, `no-fail: false` so bad Dockerfiles block PRs
- `Auto-stale.yml` — Marks issues stale after 60 days, closes after 7 more
- `Auto-cleanup-feature-branches.yml` — Deletes merged codex/* and copilot/* branches after 2 days
- `codeql.yml` — Security scanning on PRs and weekly (new, added this session)

---

## Related Projects

**gun-db** — A forked and now independently maintained CC0 firearm reference dataset at `https://github.com/Gogorichielab/gun-db`. Originally from GunClear (abandoned). Being improved to serve as the data source for a future auto-fill feature in Pew Pew Collection where users can look up a make/model and have fields pre-populated. Data is JSON files structured as `{manufacturer}/{model}/{model-number}.json` with fields: caliber, barrel length, style, fire mode, and serial decoder.

---

## Monetization Plans

- Future premium license via one-time license key purchase
- Self-hosted model retained — no SaaS pivot for the core app
- License enforcement via node-machine-id style hardware binding
- ISC license needs to change before attracting more contributors or going public — consider BUSL or Commons Clause
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

---

## Preferred Tone for This Project

The owner prefers direct, consultant-style answers. Ask clarifying questions before giving detailed answers. Keep responses concise and actionable.
