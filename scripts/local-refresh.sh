#!/bin/zsh
# Fetch the feeds that block cloud servers (sources marked `local: true`) from this Mac, and publish them
# to the `local-feeds` branch for the daily GitHub Action to import. Run daily by launchd; see docs/local-feeds.md.
set -euo pipefail

cd "${0:A:h}/.."
export PATH="/opt/homebrew/bin:/usr/bin:/bin"
export DB_PATH=data/local.db

echo "== $(date) local refresh"
node src/lib/fetcher.ts --local
node scripts/export-local.ts > data/local-items.json

# Commit the export as the only file on an orphan branch, without touching the working tree or current branch.
blob=$(git hash-object -w data/local-items.json)
tree=$(printf '100644 blob %s\tlocal-items.json\n' "$blob" | git mktree)
commit=$(git commit-tree "$tree" -m "Local feeds $(date -u +%Y-%m-%dT%H:%MZ)")
git push --force --quiet origin "${commit}:refs/heads/local-feeds"
echo "Pushed $commit to local-feeds"
