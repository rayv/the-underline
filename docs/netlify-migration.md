# Netlify Migration Notes

Status: **code complete, not yet deployed** (2026-10-11). Option A1 is built with Astro: a static site, rebuilt daily by GitHub Actions and deployed to Netlify. See [Implementation](#implementation) for what was built and where it differs from the plan below. Everything after that section is the original analysis, kept for reference.

Decided: **refresh once a day.** Higher ed news doesn't move fast enough to need anything more frequent. See [Refresh cadence](#refresh-cadence).

## Implementation

The Hono server was replaced by an Astro 7 static site (`output: 'static'`). The fetcher, source registry and SQLite schema were kept as they were and moved into `src/lib/`.

| Piece | Where |
| --- | --- |
| Pages | `src/pages/` and the `River` and `ItemRow` components. `getStaticPaths` generates every section, source and page. |
| RSS | `@astrojs/rss`, via `src/lib/feed.ts`, for the whole site, each section and each source |
| OPML, JSON | Endpoints in `src/pages/sources.opml.ts`, `items.json.ts` and `search.json.ts` |
| Times, badges, theme | `src/scripts/page.ts`, which runs in the browser |
| Search | `src/scripts/search.ts`, which filters `/search.json` (about 400 KB, about 100 KB compressed) in the browser |
| Daily job | `.github/workflows/refresh.yml` |
| Netlify config | `netlify.toml` (skips git-triggered builds) and `public/_headers` (caching) |

**Differences from the plan below:**
- **URL slugs:** sections are `/news/`, `/vendors/`, `/vendor-watch/`, `/voices/` and `/orgs/`, not `/vendor/` and so on. Paging is `/<section>/page/N/`. Source pages show up to 100 items and aren't paged.
- **Search:** it filters `search.json` in the browser instead of using Pagefind. Pagefind indexes whole pages, and the headline lists here aren't useful search results. The JSON approach matches individual headlines, with the same prefix rule the old SQLite search used.
- **Empty-database guard:** `npm run build` fails if `data/news.db` has no items, unless `ALLOW_EMPTY=1` is set. A build without the database can never replace the live site with an empty one.
- **Netlify builds are disabled** with `ignore = "exit 0"` in `netlify.toml`. All deploys come from the Action's `netlify deploy`.
- **Database backup:** each run saves `data/` to the Actions cache and also uploads `news.db` as a 30-day artifact. If the cache is evicted, download the latest artifact into `data/` before the next run.
- **Database file:** the fetcher folds SQLite's side file (`news.db-wal`) back into `news.db` before exiting, so the cached file is complete on its own.
- **Local tooling note:** Astro 7's `astro dev` switches to a background daemon (`astro dev stop` / `status` / `logs`) when it detects an AI coding agent. In a normal terminal, it runs in the foreground.

**Remaining steps:**
1. Push the repo to GitHub, with `main` as the default branch.
2. Create the Netlify site, without connecting it to the repo for builds, and a personal access token.
3. Add the repo secrets `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`, and the repo variable `SITE_URL`.
4. Run "Refresh and deploy" manually once, then check the live site and its RSS links.

## The problem

The app currently runs as a long-lived Node server (`npm start`). It depends on two things that only a server that stays up can provide:

1. **The in-process refresh timer.** `src/server.ts` calls `setInterval(refresh, REFRESH_MINUTES)`. Netlify Functions are request-scoped and stop after each invocation, so the timer never fires.
   - Netlify Scheduled Functions can run on a cron, but each run is capped at about 30 seconds.
   - A full fetch of all 81 sources took between 4 and 22 seconds in testing. One slow feed can push it past the cap.
2. **The SQLite file on local disk.** `data/news.db` holds the accumulated history. Feeds expose only their latest 10–50 items, so the database is what lets the site show 90 days of headlines.
   - Netlify Functions have no persistent filesystem. Anything written there disappears between invocations.

A daily refresh doesn't remove either constraint. It only changes how cheap each workaround is.

The rest of the stack works anywhere: Hono, server-rendered HTML, `rss-parser`, and native TypeScript in Node 24+.

## Refresh cadence

We'll fetch once a day. Each fetch has to reach a feed before new items push unseen ones out of it. That means every feed's window (the time span covered by the items it exposes) must be longer than the interval between fetches.

Feed windows measured on 2026-10-11:

| Source | Items in feed | Window | Days of margin with a daily fetch |
| --- | --- | --- | --- |
| The EDU Ledger (Diverse) | 10 | ~1.2 days | **~0.2** (tightest) |
| The PIE News | 10 | ~2.2 days | ~1.2 |
| Inside Higher Ed | 10 | ~2.4 days | ~1.4 |
| Higher Ed Dive | 10 | ~3 days | ~2 |
| Everything else | — | 4+ days | plenty |

A daily refresh is safe, but The EDU Ledger has little margin. If a busy news day ever drops items from it, switch to twice daily (`0 13,1 * * *`). That costs almost nothing.

Run the refresh early in the morning US time so the site is current for the workday. For example, `0 13 * * *` is 13:00 UTC, which is 6 AM Pacific and 9 AM Eastern during daylight time.

Once a day, relative timestamps such as "3h ago" baked into the HTML would be up to a day out of date. They must be rendered on the client (see the code change table below).

## Option A: Static site rebuilt on a schedule (recommended)

A scheduled job fetches the feeds, renders every page to static files, and deploys them to Netlify. Netlify serves only static files, and no app code runs there.

```
GitHub Actions (cron, daily at 13:00 UTC)
  ├─ restore data/news.db (Actions cache or artifact)
  ├─ npm run fetch                 → updates news.db
  ├─ npm run build                 → renders dist/ from news.db
  ├─ save data/news.db
  └─ netlify deploy --prod --dir=dist
```

### Where the daily job runs

With a daily refresh, both of these work. Before the cadence decision, Netlify builds were ruled out on cost, since 30-minute rebuilds would mean about 1,440 builds a month. A daily build is about 30 builds of roughly 1–2 minutes each, which should fit within normal plan allowances. Check the current plan anyway.

**A1. GitHub Actions builds and deploys (preferred).**
- Keeping `news.db` between runs is trivial with `actions/cache`. A daily run uses the cache well within its 7-day eviction window.
- No Netlify build minutes are used. Netlify only receives the finished files.
- Requires a Netlify access token stored as a GitHub secret.

**A2. Everything on Netlify.**
```
Netlify Scheduled Function (daily) → POST to build hook
Netlify build: restore news.db from Netlify Blobs → fetch → build → save news.db to Blobs → publish dist/
```
- Uses one platform, with no GitHub secrets or workflow.
- The build must read and write Netlify Blobs. Confirm how a build authenticates to Blobs before choosing this; it may need the site ID and a token passed in. The build cache alone is not a reliable home for the database.
- Uses about 30 builds a month.

Choose A1 unless keeping everything inside Netlify matters more than simple database handling.

### What changes in the code

| Area | Change |
| --- | --- |
| `src/sources.ts`, `src/fetcher.ts`, `src/db.ts` | No change. The fetcher already runs standalone with `npm run fetch`. |
| `src/views.ts` | Mostly reused. Links must point to static paths (see the URL scheme below) instead of query strings. |
| `src/queries.ts` | Reused by the build script. |
| `src/server.ts` | Replaced by `scripts/build.ts`, which writes HTML, RSS, OPML and JSON to `dist/`. You can keep it for local preview. |
| Search | Moves to the browser. Either use [Pagefind](https://pagefind.app/), which indexes `dist/` after the build, or emit `dist/search.json` (about 90 days of title, summary, source and date) and search it with a small library such as MiniSearch. |
| Pagination | Generate a fixed number of pages per listing, e.g. 10 pages of 50. |
| Relative times ("3h ago") | **Required** with a daily build, since baked-in text would be up to 24 hours wrong. Render `<time datetime>` with absolute dates and have a few lines of client-side JS convert them to relative times. The "Today" and "Yesterday" headings need the same treatment, or should use plain dates. |
| "Updated …" label | Show the build timestamp ("Updated Oct 11, 6:02 AM PT") so readers know the site refreshes daily. |
| `netlify.toml` | Add cache headers (short TTL on HTML and `rss.xml`), plus redirects if you keep old query-string URLs. |

### URL scheme

Query-string filters don't work on a static host, so the filters become paths:

| Old | New |
| --- | --- |
| `/?category=vendor` | `/vendor/` |
| `/?source=d2l` | `/source/d2l/` |
| `/?page=2` | `/page/2/` |
| `/rss.xml?category=vendor` | `/vendor/rss.xml` |
| `/rss.xml?source=d2l` | `/source/d2l/rss.xml` |
| `/api/items` | `/items.json` (latest N only, no query filters) |
| `/?q=canvas` | `/search/?q=canvas` (runs in the browser) |

Losses compared with the server version:
- Arbitrary filter combinations, such as search within one source, are no longer available unless the search page handles them in JS.
- RSS filtered by a search term is no longer available.

### Steps

1. Add `scripts/build.ts` to render all pages and feeds into `dist/`, and add `npm run build`.
2. Rework `views.ts` links to the new URL scheme, and add the client-side relative-time script.
3. Add search (Pagefind or `search.json` with MiniSearch).
4. Create the Netlify site and generate a personal access token. Add `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` as GitHub repo secrets.
5. Add `.github/workflows/refresh.yml`. It runs on a cron (`0 13 * * *`) and on manual dispatch, and handles the database with `actions/cache`:
   - Restore with a rolling key, `news-db-${{ github.run_id }}`, plus `restore-keys: news-db-`.
   - Fetch, build, and deploy with `npx netlify-cli deploy --prod --dir=dist`.
6. Seed the database once by running the workflow manually, then check the deployed site.
7. Optionally add a weekly `npm run check-feeds` job that opens an issue when feeds fail or go stale.

### Risks

- **GitHub cron timing:** scheduled runs can be delayed during busy periods, sometimes by an hour or more. That's harmless with a daily refresh.
- **Missed day:** if one daily run fails, the next run picks up anything still in the feeds. All feeds except The EDU Ledger hold at least 2 days of items, so a single missed day loses little. Add failure notifications (GitHub emails on failed workflows by default) so a multi-day outage gets noticed.
- **Actions cache eviction:** caches unused for 7 days are evicted. Daily runs keep the cache in use, so this only bites if the job is broken for a week. If the cache is lost, the site rebuilds from scratch and loses its history beyond each feed's current items. Mitigation: also upload `news.db` as a workflow artifact, or store it in Netlify Blobs or an S3 or R2 bucket.
- **Inactive repos:** GitHub disables scheduled workflows in public repos after 60 days without repo activity, so a commit or manual run is needed occasionally.

## Option B: Netlify Functions and a hosted database

This keeps the app dynamic on Netlify.

- **Server:** run Hono on Netlify Functions. Hono's handlers use standard Request and Response objects, so routes port with little change.
- **Storage:** replace `node:sqlite` with a hosted database:
  - **Turso (hosted SQLite, libSQL):** the closest match, since the SQL and FTS5 search mostly carry over. The database calls become async.
  - **Netlify DB (Postgres via Neon):** needs SQL changes. FTS5 becomes Postgres `tsvector` full-text search.
- **Refresh:** use a Netlify Scheduled Function, run daily. To stay under the 30-second cap, either split sources into batches, each with its own schedule or a rotating cursor, or have the scheduled function trigger a Background Function, which can run longer.
- **Effort:** significantly more rewriting, plus a database service to run.

Choose this only if the site gains per-user features such as accounts, saved items, email digests, or user-submitted sources.

## Option C: Leave Netlify for this app only

Hosts that keep a process running, such as Fly.io, Render or Railway, run the current code unchanged with a persistent volume for `data/`. Everything else can stay on Netlify, and this app could even live on a subdomain of a Netlify-managed domain. This is the least work, but it's one more platform to manage.

## Decision

| | A: Static + Actions | B: Functions + DB | C: Other host |
| --- | --- | --- | --- |
| Stays on Netlify | Yes | Yes | No |
| Rewrite effort | Moderate | High | None |
| Running cost (daily refresh) | ~Free | DB free tier, likely | Small monthly fee |
| Moving parts | Actions + Netlify | Netlify + DB vendor | One host |
| Live search and filters | Browser-only | Full | Full |
| Supports per-user features later | No | Yes | Yes |

**Recommendation: A1** (static site, built and deployed daily by GitHub Actions). The site is public and read-only and changes once a day, which is exactly what pre-rendered pages suit. They're fast and nearly free with nothing to crash. A2 is a reasonable alternative to keep everything on Netlify.
