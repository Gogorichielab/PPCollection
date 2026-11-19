# Wiki sources

This directory holds the source Markdown for the GitHub wiki at
<https://github.com/Gogorichielab/PPCollection/wiki>.

GitHub wikis live in a separate `.wiki.git` repo and aren't editable via the
main repo's PR workflow. This directory is the source of truth: edit pages
here and land them through a normal pull request.

## Publishing changes

`.github/workflows/wiki-sync.yml` publishes automatically. Every push to `main`
that touches `wiki/` copies `wiki/*.md` into the wiki repo and pushes it. To
publish without a change (for example after editing the wiki by hand), run
**Wiki Sync** from the Actions tab.

- Pages are copied, never deleted. To remove a page, delete it here and on
  the wiki.
- Direct edits on the wiki to a page that also exists here are overwritten on
  the next sync. Make the change here instead.
- The workflow pushes with the `WIKI_TOKEN` secret when it is set, otherwise
  with the workflow's own token.

### Publishing by hand

If the workflow can't push, publish from the root of this repo:

```bash
WIKI=/path/to/PPCollection.wiki
git clone https://github.com/Gogorichielab/PPCollection.wiki.git "$WIKI"
cp wiki/*.md "$WIKI/"
cd "$WIKI"
git add -A
git commit -m "docs: sync wiki from main repo"
git push origin master
```

GitHub renders changes to the wiki as soon as the push lands — there's no
build step.

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
