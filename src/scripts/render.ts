// Client-side rendering of headline rows from /search.json, matching the markup of ItemRow.astro.
import type { SearchIndex } from '../pages/search.json.ts';
import { escapeHtml, markedTitle } from '../lib/marks.ts';

export type IndexItem = SearchIndex['items'][number];

let indexPromise: Promise<SearchIndex> | undefined;

/** The search index, fetched once per page. */
export function loadIndex(): Promise<SearchIndex> {
  indexPromise ??= fetch('/search.json').then((r) => {
    if (!r.ok) throw new Error(`search.json: HTTP ${r.status}`);
    return r.json();
  });
  return indexPromise;
}

/** Bitmask for a set of topic slugs, in the index's bit order. */
export const maskFor = (index: SearchIndex, slugs: string[]) =>
  slugs.reduce((mask, slug) => (index.topics.includes(slug) ? mask | (1 << index.topics.indexOf(slug)) : mask), 0);

export function row(item: IndexItem, index: SearchIndex, opts: { terms?: string[]; showCategory?: boolean } = {}): string {
  const source = index.sources[item.src];
  const published = new Date(item.p);
  return `<li class="item" data-published="${item.p}" data-arrived="${item.f}"${item.m ? ' data-major' : ''}>
    <div class="item-meta">
      ${item.m ? '<span class="badge badge-major" hidden>Major</span>' : ''}
      <span class="badge badge-new" hidden>New</span>
      ${opts.showCategory === false ? '' : `<a class="item-cat" href="${source.href}">${escapeHtml(source.categoryLabel)}</a>`}
      <a class="item-source" href="/source/${item.src}/">${escapeHtml(source.name)}</a>
      ${item.a ? `<span class="item-author">· ${escapeHtml(item.a)}</span>` : ''}
      <time data-relative datetime="${item.p}" title="${published.toLocaleString()}"></time>
    </div>
    <h3 class="item-title"><a href="${escapeHtml(item.u)}" target="_blank" rel="noopener">${markedTitle(item.t, opts.terms)}</a></h3>
    ${item.s ? `<p class="item-summary">${escapeHtml(item.s)}</p>` : ''}
    ${item.h ? `<span class="item-host">${escapeHtml(item.h)}</span>` : ''}
  </li>`;
}

/** Rows grouped under day headings (in the site timezone), like the static river. */
export function dayGroups(items: IndexItem[], index: SearchIndex, opts: { showCategory?: boolean } = {}): string {
  const tz = document.documentElement.dataset.tz;
  const key = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: tz });
  const label = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz });
  let html = '';
  let current = '';
  for (const item of items) {
    const d = new Date(item.p);
    const k = key(d);
    if (k !== current) {
      html += `${current ? '</ol>' : ''}<h2 class="day" data-day="${k}">${label(d)}</h2><ol class="items">`;
      current = k;
    }
    html += row(item, index, opts);
  }
  return current ? `${html}</ol>` : '';
}
