#!/usr/bin/env bash
#
# Sync the Markdown sources in wiki/ to the GitHub wiki repo.
#
# The GitHub wiki lives in a separate repo (PPCollection.wiki.git) with no PR
# workflow, so wiki/ in this repo is the single source of truth and this script
# mirrors it across. wiki/ wins: pages edited directly in the wiki UI that no
# longer exist here will be removed (rsync --delete).
#
# Usage:
#   scripts/sync-wiki.sh                 # clones the wiki to a temp dir and pushes
#   WIKI=/path/to/PPCollection.wiki scripts/sync-wiki.sh   # reuse a local clone
#
set -euo pipefail

REPO_URL="https://github.com/Gogorichielab/PPCollection.wiki.git"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/wiki"

if [ ! -d "$SRC_DIR" ]; then
  echo "error: source wiki/ directory not found at $SRC_DIR" >&2
  exit 1
fi

CLEANUP=""
if [ -n "${WIKI:-}" ]; then
  WIKI_DIR="$WIKI"
  if [ ! -d "$WIKI_DIR/.git" ]; then
    echo "error: \$WIKI ($WIKI_DIR) is not a git clone of the wiki" >&2
    exit 1
  fi
  git -C "$WIKI_DIR" pull --ff-only
else
  WIKI_DIR="$(mktemp -d)"
  CLEANUP="$WIKI_DIR"
  trap '[ -n "$CLEANUP" ] && rm -rf "$CLEANUP"' EXIT
  echo "Cloning $REPO_URL ..."
  git clone --depth 1 "$REPO_URL" "$WIKI_DIR"
fi

rsync -a --delete --exclude='.git' "$SRC_DIR"/ "$WIKI_DIR"/

cd "$WIKI_DIR"
if git diff --quiet && git diff --cached --quiet; then
  echo "Wiki already up to date — nothing to push."
  exit 0
fi

git add -A
git commit -m "docs: sync wiki from main repo"
# GitHub wiki repos use the 'master' default branch.
git push origin HEAD:master
echo "Wiki synced."
