// Verify every registered feed (or only ones whose id matches argv) without touching the database.
// Usage: npm run check-feeds [-- id-substring]
import Parser from 'rss-parser';
import { SOURCES } from '../src/lib/sources.ts';

const filter = process.argv[2];
const sources = SOURCES.filter((s) => !filter || s.id.includes(filter));
const parser = new Parser();
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

const results = await Promise.all(
  sources.map(async (s) => {
    try {
      const res = await fetch(s.feed, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) return { s, ok: false, note: `HTTP ${res.status}` };
      const feed = await parser.parseString(await res.text());
      const latest = feed.items.map((i) => i.isoDate).filter(Boolean).sort().at(-1);
      const stale = latest && Date.now() - new Date(latest).getTime() > 180 * 86_400_000;
      return { s, ok: feed.items.length > 0, note: `${feed.items.length} items, latest ${latest?.slice(0, 10) ?? '?'}${stale ? ' (STALE)' : ''}` };
    } catch (e) {
      return { s, ok: false, note: (e as Error).message.split('\n')[0] };
    }
  }),
);

for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.s.category.padEnd(7)} ${r.s.name.padEnd(45)} ${r.note}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} feeds OK`);
process.exitCode = failed ? 1 : 0;
