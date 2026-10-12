import type { SearchIndex } from '../pages/search.json.ts';
import { markItems, refreshTimes } from './page.ts';

const MAX_RESULTS = 100;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const words = (s: string) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** Headline HTML with every word that starts with a query word wrapped in <mark>. */
function highlight(title: string, terms: string[]): string {
  const re = new RegExp(`\\b(?:${terms.join('|')})[\\p{L}\\p{N}]*`, 'giu');
  let out = '';
  let pos = 0;
  for (const m of title.matchAll(re)) {
    out += `${escapeHtml(title.slice(pos, m.index))}<mark>${escapeHtml(m[0])}</mark>`;
    pos = m.index + m[0].length;
  }
  return out + escapeHtml(title.slice(pos));
}

function row(item: SearchIndex['items'][number], source: SearchIndex['sources'][string], terms: string[]): string {
  const published = new Date(item.p);
  return `<li class="item" data-published="${item.p}" data-arrived="${item.f}"${item.m ? ' data-major' : ''}>
    <div class="item-meta">
      ${item.m ? '<span class="badge badge-major" hidden>Major</span>' : ''}
      <span class="badge badge-new" hidden>New</span>
      <a class="item-cat" href="${source.href}">${escapeHtml(source.categoryLabel)}</a>
      <a class="item-source" href="/source/${item.src}/">${escapeHtml(source.name)}</a>
      ${item.a ? `<span class="item-author">· ${escapeHtml(item.a)}</span>` : ''}
      <time data-relative datetime="${item.p}" title="${published.toLocaleString()}"></time>
    </div>
    <h3 class="item-title"><a href="${escapeHtml(item.u)}" target="_blank" rel="noopener">${highlight(item.t, terms)}</a></h3>
    ${item.s ? `<p class="item-summary">${escapeHtml(item.s)}</p>` : ''}
    ${item.h ? `<span class="item-host">${escapeHtml(item.h)}</span>` : ''}
  </li>`;
}

export async function runSearch() {
  const params = new URLSearchParams(location.search);
  const q = params.get('q')?.trim() ?? '';
  const category = params.get('category') ?? '';
  const input = document.getElementById('search-input') as HTMLInputElement | null;
  if (input) input.value = q;

  const status = document.getElementById('search-status')!;
  const list = document.getElementById('search-results')!;
  const heading = document.getElementById('river-heading')!;
  const terms = words(q);
  if (!terms.length) return;

  heading.textContent = `“${q}”`;
  document.title = `${q} · ${document.title}`;
  status.textContent = 'Searching…';

  let index: SearchIndex;
  try {
    index = await (await fetch('/search.json')).json();
  } catch {
    status.textContent = 'Search is unavailable right now.';
    return;
  }

  // Every query word must prefix-match some word in the headline, summary, source, or author.
  const matches = index.items.filter((item) => {
    const source = index.sources[item.src];
    if (!source || (category && source.category !== category)) return false;
    const hay = ` ${words(`${item.t} ${item.s ?? ''} ${source.name} ${item.a ?? ''}`).join(' ')}`;
    return terms.every((t) => hay.includes(` ${t}`));
  });

  const scope = category ? ` in ${Object.values(index.sources).find((s) => s.category === category)?.categoryLabel}` : '';
  status.innerHTML =
    (matches.length === 0
      ? `No headlines match${escapeHtml(scope)}.`
      : `${matches.length > MAX_RESULTS ? `Showing the newest ${MAX_RESULTS} of ${matches.length}` : matches.length} result${matches.length === 1 ? '' : 's'}${escapeHtml(scope)}, newest first.`) +
    (category ? ` <a href="/search/?q=${encodeURIComponent(q)}">Search everything</a>` : '');

  list.innerHTML = matches
    .slice(0, MAX_RESULTS)
    .map((item) => row(item, index.sources[item.src], terms))
    .join('');
  refreshTimes(list);
  markItems(list);
}
