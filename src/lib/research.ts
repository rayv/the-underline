// Adapters for research sources that are JSON APIs rather than feeds (see `format` in sources.ts).
// Each turns a response into the same item shape rss-parser produces, so the fetcher treats them like any feed.

import type Parser from 'rss-parser';
import type { Source } from './sources.ts';

type FeedItem = Parser.Item & { [key: string]: any };

// The OSF API routinely takes 10–30 seconds to answer.
const API_TIMEOUT_MS = 60_000;

// OpenAlex answers bursts of parallel requests with HTTP 429, so its requests go one at a time.
let openAlexQueue: Promise<unknown> = Promise.resolve();

/**
 * fetch() a source's feed. For API sources this adds a longer timeout, queues OpenAlex requests, and adds the
 * OpenAlex key. The key is added here rather than in the registry so it never reaches the built site (the sources
 * page and OPML show `feed`). OpenAlex works without one, but its keyless daily budget is per IP, which on
 * GitHub's runners means shared with strangers.
 */
export function requestFeed(source: Source, headers: Record<string, string>, timeoutMs: number): Promise<Response> {
  if (source.format !== 'openalex') {
    const timeout = source.format ? API_TIMEOUT_MS : timeoutMs;
    return fetch(source.feed, { headers, signal: AbortSignal.timeout(timeout) });
  }
  const key = process.env.OPENALEX_API_KEY;
  const url = key ? `${source.feed}&api_key=${encodeURIComponent(key)}` : source.feed;
  const res = openAlexQueue.then(() => fetch(url, { headers, signal: AbortSignal.timeout(API_TIMEOUT_MS) }));
  openAlexQueue = res.catch(() => {});
  return res;
}

export function parseApi(source: Source, body: string): { items: FeedItem[] } {
  const json = JSON.parse(body);
  switch (source.format) {
    case 'openalex':
      return { items: (json.results ?? []).map(openAlexItem) };
    case 'osf':
      return { items: (json.data ?? []).filter((p: any) => !p.attributes.date_withdrawn).map(osfItem) };
    default:
      throw new Error(`No adapter for format ${source.format}`);
  }
}

/** "Ada Lovelace", "Ada Lovelace and Charles Babbage", or "Ada Lovelace et al." */
function byline(names: string[]): string | undefined {
  if (names.length > 2) return `${names[0]} et al.`;
  return names.join(' and ') || undefined;
}

// OpenAlex stores abstracts as {word: [positions]} for licensing reasons; put the words back in order.
function abstractText(index: Record<string, number[]> | null): string | undefined {
  if (!index) return undefined;
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) for (const p of positions) words[p] = word;
  return words.join(' ');
}

function openAlexItem(w: any): FeedItem {
  return {
    guid: w.id,
    // The publisher's page, not oa_url: that is often a bare PDF download, which is an abrupt thing for a headline to do.
    link: w.primary_location?.landing_page_url ?? w.doi ?? w.id,
    title: w.display_name ?? w.title ?? '',
    creator: byline((w.authorships ?? []).map((a: any) => a.author?.display_name).filter(Boolean)),
    // Dates only; noon UTC keeps the day the same in US time zones.
    isoDate: w.publication_date ? `${w.publication_date}T12:00:00Z` : undefined,
    contentSnippet: abstractText(w.abstract_inverted_index),
  };
}

function osfItem(p: any): FeedItem {
  const a = p.attributes;
  const contributors = p.embeds?.contributors?.data ?? [];
  return {
    // Each new version gets an id like "d543g_v2"; key on the base id so revisions aren't new items.
    guid: `osf:${p.id.replace(/_v\d+$/, '')}`,
    link: p.links.html,
    title: a.title,
    creator: byline(contributors.map((c: any) => c.embeds?.users?.data?.attributes?.full_name).filter(Boolean)),
    // OSF timestamps are UTC without a zone suffix.
    isoDate: a.date_published ? `${a.date_published.replace(/Z?$/, 'Z')}` : undefined,
    contentSnippet: a.description,
  };
}
