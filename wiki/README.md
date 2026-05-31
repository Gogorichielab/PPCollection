# Wiki sources

This directory holds the source Markdown for the GitHub wiki at
<https://github.com/Gogorichielab/PPCollection/wiki>.

GitHub wikis live in a separate `.wiki.git` repo and aren't editable via the
main repo's PR workflow, so the canonical copy on the wiki and the copy here
have to be kept in sync by hand (or via a small script).

## One-time setup

```bash
git clone https://github.com/Gogorichielab/PPCollection.wiki.git
```

## Publishing changes

From the root of this repo:

```bash
WIKI=/path/to/PPCollection.wiki
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
