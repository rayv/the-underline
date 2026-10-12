# Local feeds

Some publishers block requests from cloud servers. From GitHub Actions they return `403`, or the connection times out, whatever user agent we send; this was tested from an Actions runner on 2026-10-11. Affected so far:

- Substack newsletters
- Moodle
- Kaltura
- A few self-hosted blogs whose firewalls drop cloud traffic

These sources are marked `local: true` in `src/lib/sources.ts`. The maintainer's Mac fetches them, because a home network isn't blocked.

## How it works

```
Mac, 4:30 AM Pacific (launchd)            GitHub Action, 13:00 UTC
scripts/local-refresh.sh                  .github/workflows/refresh.yml
  fetcher --local → data/local.db           restore news.db from cache
  export-local.ts → local-items.json        import-local.ts ← local-feeds branch
  push as the only file on the              fetcher --remote
  `local-feeds` orphan branch (forced)      build, deploy
```

- The Mac keeps its own database, `data/local.db`, and exports items fetched in the last 30 days. The import ignores duplicates, so stale or repeated exports are harmless.
- 4:30 AM Pacific is before 13:00 UTC in both daylight and standard time. If the Mac is asleep at 4:30, launchd runs the job when it wakes. If the Mac is off, the Action reuses the last export, and once it's more than 3 days old the run shows a warning annotation.
- The `local-feeds` branch contains only `local-items.json`. Each run force-pushes a single new commit, so its history doesn't grow.

## Operating it

| Task | Command |
| --- | --- |
| Run now | `launchctl kickstart -k gui/$(id -u)/net.theunderline.local-fetch` |
| Run by hand | `./scripts/local-refresh.sh` |
| Logs | `tail ~/Library/Logs/theunderline-local-fetch.log` |
| Status | `launchctl print gui/$(id -u)/net.theunderline.local-fetch \| grep -E "state\|last exit"` |
| Disable | `launchctl bootout gui/$(id -u)/net.theunderline.local-fetch` |
| Re-enable | `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/net.theunderline.local-fetch.plist` |

The job is defined in `~/Library/LaunchAgents/net.theunderline.local-fetch.plist`. It pushes over SSH using this repo's pinned key (`core.sshCommand` → `~/.ssh/id_ed25519`, the `rayv` account).

## Moving a source to or from local

If a source starts failing in the Action with `403` or a timeout but works from the Mac, add `local: true` to it. If you want to check whether a local source works from the cloud again, remove the flag and watch the next run.
