# The Underline

*Underlining what matters in higher ed and ed tech.*

A news aggregator for higher education and ed tech. It pulls trade press, vendor newsrooms, blogs and newsletters, and research and association feeds into one stream of headlines, newest first. Readers can browse by section or source and search headlines.

It's a static [Astro](https://astro.build) site, rebuilt once a day and hosted on Netlify. A small fetcher keeps a 90-day history of headlines in SQLite, and the build turns that history into plain HTML, RSS and JSON.

## Running it locally

Requires Node 24 or later.

```sh
npm install
npm run fetch    # pull feeds into data/news.db (takes about 10 seconds)
npm run dev      # http://localhost:4321
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Astro dev server. Reads `data/news.db` on each request. |
| `npm run fetch` | One fetch pass with a per-source report |
| `npm run build` | Static build into `dist/`. Fails if the database is empty, so an empty site is never deployed. |
| `npm run refresh` | `fetch` then `build`, which is what the daily job does |
| `npm run preview` | Serves `dist/` the way Netlify will |
| `npm run check-feeds [-- id]` | Verifies that registered feeds parse. Flags errors and stale feeds. Doesn't write to the DB. |
| `npm run typecheck` | `astro check` over `.astro` and `.ts` files |

VS Code tasks for all of these are in `.vscode/tasks.json`. ⇧⌘B builds.

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SITE_URL` | `http://localhost:4321` | Absolute site URL, used for links in the RSS feeds |
| `SITE_TZ` | `America/Los_Angeles` | Timezone used to group headlines by day |
| `DB_PATH` | `data/news.db` | SQLite file |
| `ALLOW_EMPTY` | unset | Set to `1` to allow building with an empty database |

## How it works

```
src/lib/sources.ts   source registry: the one file to edit when adding or removing feeds
src/lib/topics.ts    cross-section topics (e.g. Student Success) and their keyword rules
src/lib/fetcher.ts   fetch feeds → data/news.db
src/lib/db.ts        SQLite (built-in node:sqlite)
src/lib/queries.ts   read items and source health for the build
src/lib/format.ts    shared helpers: dates, highlighting, paging
src/pages/           Astro routes: HTML pages plus RSS, OPML and JSON endpoints
src/components/      River (the headline list) and ItemRow
src/scripts/         browser code: theme switcher, relative times, New/Major badges, search
src/styles/          global.css (palette tokens, light and dark)
```

**Sources.** Each source has a category:
- `news`
- `vendor`
- `watch`: Google News searches for vendors and outlets with no usable feed
- `blog`
- `org`

An optional `include` regex keeps only education-related posts from broad feeds such as AWS, Zoom and OpenAI.

**The fetcher:**
- Uses conditional GET requests and repairs malformed XML.
- Cleans up titles, summaries and authors.
- Drops headlines that duplicate one from another source.
- Skips items older than 90 days when a feed is first added.

**What happens in the browser.** The site is rebuilt only once a day, so anything that depends on the current time runs in the browser:
- Relative times and the "Today"/"Yesterday" headings.
- "New" badges, for items that arrived since your last visit.
- "Major" badges, for keyword-flagged news in its first 48 hours.

Search also runs in the browser, against `/search.json`.

## Routes

| Path | Content |
| --- | --- |
| `/`, `/page/N/` | All headlines |
| `/news/`, `/vendors/`, `/vendor-watch/`, `/voices/`, `/orgs/` (+ `page/N/`) | Sections |
| `/source/<id>/` | One source |
| `/topics/<slug>/` (+ `page/N/`) | A topic page: `higher-ed`, `ed-tech` or `student-success` |
| `/sources/` | Every source, with its health and latest item |
| `/about/` | What the site is and how to use it |
| `/search/?q=…&category=…` | Search |
| `/rss.xml`, `/<section>/rss.xml`, `/source/<id>/rss.xml`, `/topics/<slug>/rss.xml` | RSS feeds |
| `/sources.opml` | All source feeds, for import into a feed reader |
| `/items.json`, `/search.json` | JSON |

## Deployment

A GitHub Action, [`.github/workflows/refresh.yml`](.github/workflows/refresh.yml), runs daily at 13:00 UTC. It also runs on every push to `main` and when started manually. Each run:

1. Restores `data/` from the Actions cache.
2. Runs `npm run fetch`.
3. Saves the database back to the cache, and uploads a 30-day backup artifact.
4. Runs `npm run build`.
5. Deploys `dist/` with `netlify deploy --prod`.

`netlify.toml` tells Netlify to skip git-triggered builds, which wouldn't have the database.

One-time setup:

1. Create a Netlify site, without linking it to the repo for builds. Note its Site ID.
2. Create a Netlify personal access token.
3. In the GitHub repo, add the secrets `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`, and the variable `SITE_URL`.
4. Run the workflow manually once to seed the database and deploy.

See [docs/netlify-migration.md](docs/netlify-migration.md) for why the site is built this way.

## Topics and filters

There are three topics, defined in `src/lib/topics.ts`:

- **Higher Ed**: institutional topics such as policy, funding, enrollment, governance and labor.
- **Ed Tech**: tools, platforms and AI.
- **Student Success**: retention, completion, advising and basic needs.

They show up in two places:

- **Filter chips** on the main river, every section and search, next to an **All news / Today's news** switch. "Today's news" means this morning's edition: everything published in the 24 hours before the latest refresh, or after it. The refresh time is stamped on each page as `data-refreshed`. Topic chips combine: choosing more than one shows headlines in *any* of the selected topics. The selection follows the reader from page to page (it's stored in their browser), and it's mirrored in the URL (`?when=today&topics=higher-ed,student-success`) so a filtered view can be shared. With filters on, the page renders the list in the browser from `/search.json` instead of showing the static list.
- **Topic pages** at `/topics/<slug>/`, each with its own RSS feed. They're linked from the footer.

Each item's topics are decided at build time. Whichever rule applies first wins:

1. If the item's section is in `excludeCategories`, or it matches `exclude`, it's out. For example, Higher Ed excludes vendor posts and K-12 stories.
2. If its section is in `categories`, or its source is in `sources`, it's in. For example, every vendor post counts as Ed Tech.
3. Otherwise, it's in if its title or summary matches `pattern`, using whole-word matches.

Before shipping a rule change, check which headlines it catches. Bare "retention" mostly caught staff and data retention, and "governance" caught "AI data governance". Both now need a narrower context.

## Welcome dialog

On a reader's first page view, a dialog explains the site (`src/components/WelcomeDialog.astro`). Dismissing it is remembered in `localStorage` (`welcomed`), and visiting `/about/` counts as having seen it. If storage is unavailable, the dialog never shows, rather than showing on every page.

## Quiet sources

Sources with nothing published in the last 90 days are hidden from sidebars, which keeps out personal blogs that have gone dormant. They're still fetched and still have their own pages, and `/sources/` labels them "Quiet". They reappear in sidebars as soon as they publish again.

## Adding a source

1. Find the feed URL. Try `/feed`, `/rss.xml`, or the `<link rel="alternate">` tag in the page's HTML.
2. Add an entry to `SOURCES` in `src/lib/sources.ts`.
3. Run `npm run check-feeds -- <id>` to confirm that it parses.

If a vendor has no feed, add a `watch` source with `googleNews('"Vendor Name"')`.

## Known gaps

These have no public feed, or block automated requests:

- Instructure, Ellucian, Anthology, Unizin, Turnitin, Workday, Jenzabar and Modern Campus: covered through Google News.
- The Chronicle, EDUCAUSE Review, Times Higher Education and WCET: covered through Google News or missing.
- Phil Hill's *On EdTech*: no working feed found yet.
