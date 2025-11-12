# Agent Guidelines

## Scope
These instructions apply to the entire repository unless otherwise overridden by a nested `AGENTS.md` file.

## Coding Practices
- Follow the existing formatting conventions within each file; prefer Prettier defaults for JavaScript/TypeScript files.
- Keep functions small and focused; extract shared logic into utilities inside the `src/` tree when reasonable.
- Add or update unit tests alongside changes whenever possible.

## Documentation
- Update relevant documentation (e.g., `README.md`, `CHANGELOG.md`) when altering or adding features that affect users.

## Testing
- Run `npm test` before opening a pull request when code changes affect behavior.

## Pull Requests
- Summarize notable changes in the PR description, grouping related updates together.
- Reference any relevant issues in the PR body when applicable.

