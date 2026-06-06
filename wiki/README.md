# Wiki sources

This directory holds the source Markdown for the GitHub wiki at
<https://github.com/Gogorichielab/PPCollection/wiki>.

GitHub wikis live in a separate `.wiki.git` repo and aren't editable via the
main repo's PR workflow. This directory is the **single source of truth** — the
copy on the wiki is mirrored from here. Pages edited directly in the wiki UI are
overwritten on the next sync, so always make changes in `wiki/`.

## Automated sync (recommended)

`.github/workflows/wiki-sync.yml` pushes `wiki/**` to the wiki repo on every
change merged to `main`, and can be run manually from the Actions tab.

It needs a repo secret named `WIKI_TOKEN` — a Personal Access Token with `repo`
scope (or a fine-grained token with **Contents: write**). The default
`GITHUB_TOKEN` cannot push to `*.wiki.git` repos, which is why a PAT is
required. Add it under **Settings → Secrets and variables → Actions**.

## Manual sync

Run the helper from the repo root — it clones the wiki, mirrors `wiki/`, and
pushes:

```bash
scripts/sync-wiki.sh
```

To reuse an existing local clone instead of cloning each time:

```bash
WIKI=/path/to/PPCollection.wiki scripts/sync-wiki.sh
```

Both the script and the workflow use `rsync --delete`, so removing a file from
`wiki/` also removes that page from the wiki. GitHub renders changes as soon as
the push lands — there's no build step.

## Pages

- `Home.md` — landing page and navigation
- `_Sidebar.md` — sidebar shown on every wiki page
- `_Footer.md` — footer shown on every wiki page
- `Installation.md` — Docker, Compose, and from-source setups
- `Configuration.md` — environment variable reference
- `Security.md` — auth, CSRF, rate limiting, reverse-proxy guidance
- `Operations.md` — health probe, audit logs, backups
- `Upgrading.md` — version-specific upgrade notes
- `Architecture.md` — code layout and request lifecycle
- `Screenshots.md` — gallery (uses `raw.githubusercontent.com` URLs)
- `FAQ.md` — common questions and recovery procedures
- `Contributing.md` — contributor-facing summary

## Conventions

- Cross-page links use the wiki page name only — e.g. `[Security](Security)`,
  not a full URL. Anchor fragments use the lowercased, hyphenated heading.
- Screenshots are linked via `raw.githubusercontent.com` so they render in
  the wiki and survive renames here.
- The sidebar is the canonical nav. Don't duplicate it inside every page.
