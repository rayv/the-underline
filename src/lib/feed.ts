import rss from '@astrojs/rss';
import type { Item } from './queries.ts';
import { CATEGORIES } from './sources.ts';
import { SITE_DESCRIPTION, SITE_NAME } from './format.ts';

const RSS_ITEMS = 100;

const xml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

/** An RSS response for a listing. `scope` is appended to the channel title, e.g. "Vendors". */
export function rssResponse(opts: { site: URL | undefined; path: string; scope?: string; items: Item[] }) {
  return rss({
    title: opts.scope ? `${SITE_NAME} · ${opts.scope}` : SITE_NAME,
    description: SITE_DESCRIPTION,
    site: new URL(opts.path, opts.site ?? 'http://localhost:4321'),
    xmlns: { dc: 'http://purl.org/dc/elements/1.1/' },
    items: opts.items.slice(0, RSS_ITEMS).map((i) => ({
      title: `${i.title} (${i.source.name})`,
      link: i.url,
      pubDate: i.publishedAt,
      description: i.summary ?? undefined,
      categories: [CATEGORIES[i.source.category].label],
      customData: i.author ? `<dc:creator>${xml(i.author)}</dc:creator>` : undefined,
    })),
  });
}
