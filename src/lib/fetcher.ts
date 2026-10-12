import Parser from 'rss-parser';
import { db } from './db.ts';
import { SOURCES, type Source } from './sources.ts';

// Several publishers sit behind bot filters that reject non-browser user agents.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const TIMEOUT_MS = 20_000;
const CONCURRENCY = 8;
const MAX_AGE_DAYS = 90; // ignore backlog older than this when a feed is first added
const MAX_ITEMS_PER_FETCH = 60;

const parser = new Parser({ timeout: TIMEOUT_MS });

// Feeds in the wild are often slightly malformed; repair the most common problem
// (bare ampersands) before handing to the strict XML parser.
function sanitizeXml(xml: string): string {
  return xml.replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
}

function cleanText(value: unknown, max: number): string {
  // Some feeds hand back objects (e.g. Atom <title type="html">) instead of strings.
  const s = typeof value === 'string' ? value : (value as any)?._ ?? (value as any)?.name ?? '';
  if (typeof s !== 'string' || !s) return '';
  const text = s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8230;|&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, '') + '…' : text;
}

// "jane@example.com (Jane Doe)" → "Jane Doe"; a bare email address is dropped.
function cleanAuthor(author: string): string | null {
  const paren = author.match(/\(([^)]+)\)/);
  if (paren) return paren[1].trim();
  return author && !author.includes('@') ? author : null;
}

function cleanSummary(summary: string, title: string): string {
  let s = summary;
  if (s.startsWith(title)) s = s.slice(title.length);
  // Drupal-style feeds (e.g. Inside Higher Ed) prefix the teaser with "Author Date - Time"
  // and append a "Byline(s)" footer.
  s = s.replace(/^.{0,120}?\d{2}\/\d{2}\/\d{4} - \d{2}:\d{2} [AP]M\s*/, '');
  s = s.replace(/\s*Byline\(s\).*$/, '').trim();
  return s.length > 320 ? s.slice(0, 320).replace(/\s+\S*$/, '') + '…' : s;
}

const insertItem = db.prepare(`
  INSERT OR IGNORE INTO items (source_id, guid, url, title, summary, author, published_at, fetched_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const recentTitleExists = db.prepare(`
  SELECT 1 FROM items WHERE source_id != ? AND published_at > ? AND lower(title) = ? LIMIT 1
`);
const getStatus = db.prepare(`SELECT etag, last_modified FROM source_status WHERE source_id = ?`);
const upsertStatus = db.prepare(`
  INSERT INTO source_status (source_id, etag, last_modified, last_attempt, last_success, last_error, item_count)
  VALUES (?, ?, ?, ?, ?, ?, (SELECT count(*) FROM items WHERE source_id = ?))
  ON CONFLICT (source_id) DO UPDATE SET
    etag = coalesce(excluded.etag, etag),
    last_modified = coalesce(excluded.last_modified, last_modified),
    last_attempt = excluded.last_attempt,
    last_success = coalesce(excluded.last_success, last_success),
    last_error = excluded.last_error,
    item_count = excluded.item_count
`);

export interface FetchResult {
  source: Source;
  added: number;
  status: 'ok' | 'not-modified' | 'error';
  error?: string;
}

async function fetchSource(source: Source): Promise<FetchResult> {
  const now = new Date();
  const nowIso = now.toISOString();
  const prev = getStatus.get(source.id) as { etag: string | null; last_modified: string | null } | undefined;

  const headers: Record<string, string> = {
    'user-agent': USER_AGENT,
    accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5',
  };
  if (prev?.etag) headers['if-none-match'] = prev.etag;
  if (prev?.last_modified) headers['if-modified-since'] = prev.last_modified;

  try {
    const res = await fetch(source.feed, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 304) {
      upsertStatus.run(source.id, null, null, nowIso, nowIso, null, source.id);
      return { source, added: 0, status: 'not-modified' };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const feed = await parser.parseString(sanitizeXml(await res.text()));
    const cutoff = new Date(now.getTime() - MAX_AGE_DAYS * 86_400_000).toISOString();
    const dedupeWindow = new Date(now.getTime() - 14 * 86_400_000).toISOString();
    const isGoogleNews = source.feed.startsWith('https://news.google.com/');
    let added = 0;

    for (const item of (feed.items ?? []).slice(0, MAX_ITEMS_PER_FETCH)) {
      const url = item.link?.trim();
      let title = cleanText(item.title, 300);
      if (!url || !title) continue;

      // Google News appends " - Publisher" to every headline; strip it and keep the publisher as author.
      let author = cleanAuthor(cleanText(item.creator ?? (item as any).author, 120));
      if (isGoogleNews) {
        const m = title.match(/^(.*) - (.+)$/); // greedy: split on the last " - ", publishers can contain hyphens
        if (m) [title, author] = [m[1].trim(), m[2].trim()];
      }

      let published = item.isoDate ? new Date(item.isoDate) : now;
      if (isNaN(published.getTime()) || published > now) published = now;
      const publishedIso = published.toISOString();
      if (publishedIso < cutoff) continue;

      // Google News descriptions are just the headline again, so skip them.
      const summary = isGoogleNews ? '' : cleanSummary(cleanText(item.contentSnippet ?? item.content ?? item.summary, 600), title);
      if (source.include && !source.include.test(`${title} ${summary}`)) continue;
      if (recentTitleExists.get(source.id, dedupeWindow, title.toLowerCase())) continue;

      const guid = item.guid ?? item.id ?? url;
      const r = insertItem.run(source.id, guid, url, title, summary || null, author, publishedIso, nowIso);
      added += Number(r.changes);
    }

    upsertStatus.run(source.id, res.headers.get('etag'), res.headers.get('last-modified'), nowIso, nowIso, null, source.id);
    return { source, added, status: 'ok' };
  } catch (err) {
    const message = err instanceof Error ? err.message.split('\n')[0] : String(err);
    upsertStatus.run(source.id, null, null, nowIso, null, message, source.id);
    return { source, added: 0, status: 'error', error: message };
  }
}

let running: Promise<FetchResult[]> | null = null;

/** Fetch every source with bounded concurrency. Concurrent callers share one run. */
export function fetchAll(sources: Source[] = SOURCES): Promise<FetchResult[]> {
  running ??= (async () => {
    const queue = [...sources];
    const results: FetchResult[] = [];
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (let s = queue.shift(); s; s = queue.shift()) results.push(await fetchSource(s));
      }),
    );
    return results;
  })().finally(() => (running = null));
  return running;
}

// `node src/lib/fetcher.ts [--local | --remote]`: run one fetch pass and print a report.
//   --remote  skip sources marked `local` (what the GitHub Action runs; those publishers block cloud servers)
//   --local   only sources marked `local` (what scripts/local-refresh.sh runs on the maintainer's Mac)
if (import.meta.main) {
  const started = Date.now();
  const mode = process.argv.includes('--local') ? 'local' : process.argv.includes('--remote') ? 'remote' : 'all';
  const sources = SOURCES.filter((s) => mode === 'all' || (mode === 'local') === !!s.local);
  const results = await fetchAll(sources);
  for (const r of results.sort((a, b) => a.source.name.localeCompare(b.source.name))) {
    const tag = r.status === 'error' ? 'ERR ' : r.status === 'not-modified' ? '304 ' : 'OK  ';
    console.log(`${tag} ${r.source.name.padEnd(45)} ${r.error ?? `+${r.added}`}`);
  }
  const total = results.reduce((n, r) => n + r.added, 0);
  const errors = results.filter((r) => r.status === 'error').length;
  console.log(`\n${total} new items from ${results.length} sources (${errors} errors) in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  // Fold the WAL back into news.db so the file is self-contained when CI caches or uploads it.
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  db.close();
}
