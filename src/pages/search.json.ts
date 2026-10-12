import type { APIRoute } from 'astro';
import { getItems } from '../lib/queries.ts';
import { CATEGORIES, SOURCES } from '../lib/sources.ts';
import { hostname, isMajorCandidate } from '../lib/format.ts';

export interface SearchIndex {
  sources: Record<string, { name: string; category: string; categoryLabel: string; href: string }>;
  items: { t: string; u: string; s: string | null; a: string | null; src: string; p: string; f: string; m?: 1; h?: string }[];
}

// Compact index of every item for client-side search on /search/.
export const GET: APIRoute = () => {
  const index: SearchIndex = {
    sources: Object.fromEntries(
      SOURCES.map((s) => [
        s.id,
        { name: s.name, category: s.category, categoryLabel: CATEGORIES[s.category].label, href: `/${CATEGORIES[s.category].slug}/` },
      ]),
    ),
    items: getItems().map((i) => ({
      t: i.title,
      u: i.url,
      s: i.summary,
      a: i.author && i.author !== i.source.name ? i.author : null,
      src: i.source.id,
      p: i.publishedAt.toISOString(),
      f: i.fetchedAt.toISOString(),
      ...(isMajorCandidate(i) ? { m: 1 as const } : {}),
      ...(i.source.category !== 'watch' ? { h: hostname(i.url) } : {}),
    })),
  };
  return new Response(JSON.stringify(index), { headers: { 'content-type': 'application/json' } });
};
