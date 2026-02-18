# Agent Guidelines

## Scope
These instructions apply to the entire repository unless otherwise overridden by a nested `AGENTS.md` file.

---

## Project Overview

PPCollection is a self-hosted, offline-first firearm inventory management app. It runs as a Node.js/Express server with SQLite for storage and EJS for server-side rendering. There is no build step and no frontend framework.

### Architecture

The codebase follows a strict layered architecture. Always respect these boundaries:

```
src/
├── app/
│   ├── createApp.js          # App factory — wires all layers together
│   ├── middleware/           # Express middleware (auth, etc.)
│   └── routes/               # Route registration
├── features/
│   └── <feature>/
│       ├── <feature>.controller.js   # HTTP layer — req/res only
│       ├── <feature>.routes.js       # Route definitions
│       ├── <feature>.service.js      # Business logic
│       └── <feature>.validators.js   # Input sanitization
├── infra/
│   ├── config/               # Environment variable config
│   └── db/
│       ├── client.js         # SQLite connection
│       ├── migrate.js        # Migration runner
│       ├── migrations/       # SQL migration files (numbered, e.g. 001_*.sql)
│       └── repositories/     # Database access layer
├── shared/                   # Shared utilities (e.g. csv.js)
└── views/                    # EJS templates
    ├── partials/layout.ejs   # Shared layout wrapper
    └── <feature>/            # Feature-specific views
```

**Key rules:**
- Controllers must not contain business logic — delegate to services
- Services must not query the database directly — delegate to repositories
- Repositories must not contain business logic — SQL only
- Do not add new inline styles to EJS templates — use `styles.css`

---

## Coding Practices

- Follow the existing formatting conventions within each file; prefer Prettier defaults for JavaScript/TypeScript files
- Keep functions small and focused; extract shared logic into utilities inside the `src/shared/` tree when reasonable
- Add or update unit tests alongside changes whenever possible
- All new features must follow the existing controller/service/repository pattern

---

## Database & Migrations

- All schema changes must be implemented as a new numbered SQL migration file in `src/infra/db/migrations/`
- Never modify an existing migration file
- `ensureLegacyColumns` in `migrate.js` is a known code smell scheduled for removal — do not add new columns there
- The `maintenance_logs` and `range_sessions` tables exist in the schema but have no UI — do not remove them, they are reserved for future features

---

## CSS & Frontend

- All styles must be defined in `src/public/css/styles.css` — do not add inline styles to EJS templates
- All mobile overrides must be added inside the existing `@media (max-width: 640px)` block at the bottom of `styles.css` — do not create additional media query blocks
- Dark mode and light mode are controlled via `[data-theme]` attribute on `<html>` — always test style changes in both themes
- There is no frontend build step — do not introduce bundlers, transpilers, or npm scripts that require a build

---

## Commit Messages

This repository uses **semantic-release** with the **conventional commits** preset. All commits must follow this format:

```
<type>(<optional scope>): <short description>
```

**Types and their release impact:**
| Type | Release | Use for |
|------|---------|---------|
| `feat` | minor | New features |
| `fix` | patch | Bug fixes |
| `style` | patch | CSS / formatting changes |
| `refactor` | patch | Code restructuring without behaviour change |
| `test` | patch | Adding or updating tests |
| `docs` | patch | Documentation only |
| `perf` | patch | Performance improvements |
| `ci` | patch | CI/CD changes |
| `chore` | none | Maintenance tasks that don't affect the release |

**Breaking changes:** Add `BREAKING CHANGE:` in the commit footer to trigger a major release.

**Examples:**
```
feat(firearms): add status badge column to inventory table
fix(auth): redirect to login on expired session
style(mobile): stack action bar buttons on small viewports
refactor(migrate): move legacy columns to sql migration file
```

---

## Testing

- Run `npm test` before opening a pull request when code changes affect behaviour
- Unit tests live in `tests/unit/` — cover new service and repository functions here
- Integration tests live in `tests/integration/` — cover new routes and controller behaviour here
- CSS-only changes do not require new tests but must not break existing ones
- Do not delete or skip existing tests

---

## Documentation

- Update `README.md` when altering or adding features that affect how users install, configure, or use the app
- `CHANGELOG.md` is managed automatically by semantic-release — do not edit it manually

---

## Pull Requests

- Summarize notable changes in the PR description, grouping related updates together
- Reference any relevant issues in the PR body when applicable
- One logical change per PR — do not bundle unrelated fixes
