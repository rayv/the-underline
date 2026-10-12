import { escapeHtml } from '../lib/marks.ts';
import { loadIndex, row } from './render.ts';
import { markItems, refreshTimes } from './page.ts';
import { applyFilters, describeFilters, getFilters, type Filters } from './filters.ts';

const MAX_RESULTS = 100;

const words = (s: string) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

async function search(q: string, category: string, filters: Filters) {
  const status = document.getElementById('search-status')!;
  const list = document.getElementById('search-results')!;
  const terms = words(q);
  if (!terms.length) return;

  status.textContent = 'Searching…';
  let index;
  try {
    index = await loadIndex();
  } catch {
    status.textContent = 'Search is unavailable right now.';
    return;
  }

  // Every query word must prefix-match some word in the headline, summary, source, or author.
  const matches = applyFilters(index, filters).filter((item) => {
    const source = index.sources[item.src];
    if (!source || (category && source.category !== category)) return false;
    const hay = ` ${words(`${item.t} ${item.s ?? ''} ${source.name} ${item.a ?? ''}`).join(' ')}`;
    return terms.every((t) => hay.includes(` ${t}`));
  });

  const scope = [
    category && `in ${Object.values(index.sources).find((s) => s.category === category)?.categoryLabel}`,
    describeFilters(filters),
  ]
    .filter(Boolean)
    .join(' ');
  const count =
    matches.length > MAX_RESULTS ? `Showing the newest ${MAX_RESULTS} of ${matches.length}` : String(matches.length);
  status.innerHTML =
    (matches.length === 0
      ? `No headlines match${scope ? ` ${escapeHtml(scope)}` : ''}.`
      : `${count} result${matches.length === 1 ? '' : 's'}${scope ? ` ${escapeHtml(scope)}` : ''}, newest first.`) +
    (category ? ` <a href="/search/?q=${encodeURIComponent(q)}">Search all sections</a>` : '');

  list.innerHTML = matches
    .slice(0, MAX_RESULTS)
    .map((item) => row(item, index, { terms }))
    .join('');
  refreshTimes(list);
  markItems(list);
}

export function runSearch() {
  const params = new URLSearchParams(location.search);
  const q = params.get('q')?.trim() ?? '';
  const category = params.get('category') ?? '';
  const input = document.getElementById('search-input') as HTMLInputElement | null;
  if (input) input.value = q;
  if (!words(q).length) return;

  document.getElementById('river-heading')!.textContent = `“${q}”`;
  document.title = `${q} · ${document.title}`;
  search(q, category, getFilters());
  document.addEventListener('filterschange', (e) => search(q, category, (e as CustomEvent<Filters>).detail));
}
