import { db } from './db.ts';
import { SOURCES, SOURCE_BY_ID, type Category, type Source } from './sources.ts';

export interface Item {
  id: number;
  url: string;
  title: string;
  summary: string | null;
  author: string | null;
  publishedAt: Date;
  fetchedAt: Date;
  source: Source;
}

export interface Scope {
  category?: Category;
  sourceId?: string;
}

/** Items for a listing, newest first. Only sources still in the registry are included, so removing one hides its history. */
export function getItems({ category, sourceId }: Scope = {}, limit = 2000): Item[] {
  let ids = SOURCES.filter((s) => !category || s.category === category).map((s) => s.id);
  if (sourceId) ids = ids.filter((id) => id === sourceId);
  if (!ids.length) return [];

  const rows = db
    .prepare(
      `SELECT id, url, title, summary, author, published_at, fetched_at, source_id
       FROM items WHERE source_id IN (${ids.map(() => '?').join(',')})
       ORDER BY published_at DESC LIMIT ?`,
    )
    .all(...ids, limit) as any[];

  return rows.map((r) => ({
    id: r.id,
    url: r.url,
    title: r.title,
    summary: r.summary,
    author: r.author,
    publishedAt: new Date(r.published_at),
    fetchedAt: new Date(r.fetched_at),
    source: SOURCE_BY_ID.get(r.source_id)!,
  }));
}

export interface SourceStatus {
  source: Source;
  lastSuccess: Date | null;
  lastError: string | null;
  itemCount: number;
  latestItem: Date | null;
}

export function sourceStatuses(): SourceStatus[] {
  const rows = db
    .prepare(
      `SELECT s.source_id, s.last_success, s.last_error, s.item_count,
              (SELECT max(published_at) FROM items WHERE source_id = s.source_id) AS latest
       FROM source_status s`,
    )
    .all() as any[];
  const byId = new Map(rows.map((r) => [r.source_id, r]));
  return SOURCES.map((source) => {
    const r = byId.get(source.id);
    return {
      source,
      lastSuccess: r?.last_success ? new Date(r.last_success) : null,
      lastError: r?.last_error ?? null,
      itemCount: r?.item_count ?? 0,
      latestItem: r?.latest ? new Date(r.latest) : null,
    };
  });
}

export function lastRefresh(): Date | null {
  const r = db.prepare(`SELECT max(last_attempt) AS t FROM source_status`).get() as { t: string | null };
  return r.t ? new Date(r.t) : null;
}
