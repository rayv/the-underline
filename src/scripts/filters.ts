// Listing filters: a time range (All news / Today's news) and topic chips (Higher Ed, Ed Tech, Student Success).
// Topics combine: an item shows if it's in any selected topic. Both settings follow the reader across pages
// (localStorage) and are mirrored into the URL (?when=today&topics=a,b) so a filtered view can be shared.
// Static listings stay as built; when any filter is on, the list is rendered here from /search.json instead.
import { dayGroups, loadIndex, maskFor, type IndexItem } from './render.ts';
import { markItems, refreshTimes } from './page.ts';
import type { SearchIndex } from '../pages/search.json.ts';

export type When = 'all' | 'today';
export interface Filters {
  when: When;
  topics: string[];
}

const PAGE = 50;
const DAY_MS = 86_400_000;

const chips = () => [...document.querySelectorAll<HTMLButtonElement>('.chip[data-topic]')];
const whenButtons = () => [...document.querySelectorAll<HTMLButtonElement>('.when-btn')];

function stored(key: string): string | null {
  const fromUrl = new URLSearchParams(location.search).get(key);
  if (fromUrl !== null) return fromUrl;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getFilters(): Filters {
  const known = chips().map((c) => c.dataset.topic!);
  return {
    when: stored('when') === 'today' ? 'today' : 'all',
    topics: (stored('topics') ?? '').split(',').filter((t) => known.includes(t)),
  };
}

export const isFiltering = (f: Filters) => f.when === 'today' || f.topics.length > 0;

/** "Today's news" = this morning's edition: published within 24 hours before the latest refresh, or after it. */
export function todayCutoff(): number {
  const refreshed = Date.parse(document.documentElement.dataset.refreshed ?? '') || Date.now();
  return refreshed - DAY_MS;
}

/** Items passing the time range and topic filters (category and search terms are up to the caller). */
export function applyFilters(index: SearchIndex, f: Filters): IndexItem[] {
  const mask = maskFor(index, f.topics);
  const cutoff = f.when === 'today' ? todayCutoff() : 0;
  return index.items.filter((i) => (!mask || (i.k & mask) !== 0) && (!cutoff || Date.parse(i.p) >= cutoff));
}

const topicLabel = (slug: string) => chips().find((c) => c.dataset.topic === slug)?.textContent ?? slug;

/** e.g. "from today's edition about Ed Tech or Student Success" */
export function describeFilters(f: Filters): string {
  return [f.when === 'today' && "from today's edition", f.topics.length && `about ${f.topics.map(topicLabel).join(' or ')}`]
    .filter(Boolean)
    .join(' ');
}

function setFilters(f: Filters, notify = true) {
  try {
    if (f.when === 'today') localStorage.setItem('when', 'today');
    else localStorage.removeItem('when');
    if (f.topics.length) localStorage.setItem('topics', f.topics.join(','));
    else localStorage.removeItem('topics');
  } catch {}
  const url = new URL(location.href);
  if (f.when === 'today') url.searchParams.set('when', 'today');
  else url.searchParams.delete('when');
  if (f.topics.length) url.searchParams.set('topics', f.topics.join(','));
  else url.searchParams.delete('topics');
  history.replaceState(null, '', url.href.replace(/%2C/g, ',')); // keep "?topics=a,b" readable
  syncControls(f);
  if (notify) document.dispatchEvent(new CustomEvent<Filters>('filterschange', { detail: f }));
}

function syncControls(f: Filters) {
  for (const chip of chips()) chip.setAttribute('aria-pressed', String(f.topics.includes(chip.dataset.topic!)));
  for (const btn of whenButtons()) btn.setAttribute('aria-pressed', String(btn.dataset.when === f.when));
  document.querySelector<HTMLElement>('.chip-clear')?.toggleAttribute('hidden', !f.topics.length);
  if (isFiltering(f)) document.documentElement.dataset.filtering = '';
  else delete document.documentElement.dataset.filtering;
}

/** Re-render a filterable listing for the current filters. */
async function renderRiver(river: HTMLElement, f: Filters) {
  const status = river.querySelector<HTMLElement>('.filter-status')!;
  const target = river.querySelector<HTMLElement>('.river-filtered')!;
  if (!isFiltering(f)) {
    status.hidden = target.hidden = true;
    target.innerHTML = '';
    return;
  }
  status.hidden = false;
  status.textContent = 'Filtering…';
  let index: SearchIndex;
  try {
    index = await loadIndex();
  } catch {
    status.textContent = 'Filters are unavailable right now.';
    return;
  }
  const category = river.dataset.category;
  const matches = applyFilters(index, f).filter((i) => !category || index.sources[i.src]?.category === category);

  const feed = f.topics.length === 1 && f.when === 'all' ? ` <a href="/topics/${f.topics[0]}/rss.xml">RSS</a>` : '';
  status.innerHTML = `${matches.length} headline${matches.length === 1 ? '' : 's'} ${describeFilters(f)}.${feed}`;

  let shown = 0;
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'more-btn';
  more.textContent = 'Show more';
  const showMore = () => {
    // Re-render the whole slice so day headings never repeat across batches.
    shown = Math.min(matches.length, shown + PAGE);
    target.innerHTML = dayGroups(matches.slice(0, shown), index, { showCategory: !category });
    if (shown < matches.length) target.append(more);
    refreshTimes(target);
    markItems(target);
  };
  more.addEventListener('click', showMore);
  target.hidden = false;
  showMore();
  if (!matches.length) {
    target.innerHTML = `<p class="empty">${f.when === 'today' ? 'Nothing new here in today’s edition.' : 'Nothing here matches those topics yet.'}</p>`;
  }
}

export function initFilters() {
  if (!chips().length) return;
  // Normalize the URL and storage to what's shown (e.g. a selection carried over from another page).
  setFilters(getFilters(), false);

  for (const chip of chips()) {
    chip.addEventListener('click', () => {
      const f = getFilters();
      const t = chip.dataset.topic!;
      setFilters({ ...f, topics: f.topics.includes(t) ? f.topics.filter((x) => x !== t) : [...f.topics, t] });
    });
  }
  for (const btn of whenButtons()) {
    btn.addEventListener('click', () => setFilters({ ...getFilters(), when: btn.dataset.when as When }));
  }
  document.querySelector('.chip-clear')?.addEventListener('click', () => setFilters({ ...getFilters(), topics: [] }));

  const river = document.querySelector<HTMLElement>('.river[data-filterable]');
  if (river) {
    renderRiver(river, getFilters());
    document.addEventListener('filterschange', (e) => renderRiver(river, (e as CustomEvent<Filters>).detail));
  }
}
