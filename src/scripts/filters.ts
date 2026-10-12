// Topic filter chips (Higher Ed, Ed Tech, Student Success). Several can be on at once; an item shows if it's
// in any selected topic. The selection follows the reader across pages (localStorage) and is mirrored into
// the URL (?topics=a,b) so a filtered view can be shared. Static listings stay as built; when filters are on,
// the list is rendered here from /search.json instead.
import { dayGroups, loadIndex, maskFor } from './render.ts';
import { markItems, refreshTimes } from './page.ts';

const STORAGE_KEY = 'topics';
const PAGE = 50;

const chips = () => [...document.querySelectorAll<HTMLButtonElement>('.chip[data-topic]')];
const knownTopics = () => chips().map((c) => c.dataset.topic!);

export function getSelectedTopics(): string[] {
  let raw: string | null = new URLSearchParams(location.search).get('topics');
  if (raw === null) {
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {}
  }
  const known = knownTopics();
  return (raw ?? '').split(',').filter((t) => known.includes(t));
}

function setSelectedTopics(topics: string[], notify = true) {
  try {
    if (topics.length) localStorage.setItem(STORAGE_KEY, topics.join(','));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
  const url = new URL(location.href);
  if (topics.length) url.searchParams.set('topics', topics.join(','));
  else url.searchParams.delete('topics');
  history.replaceState(null, '', url.href.replace(/%2C/g, ',')); // keep "?topics=a,b" readable
  syncChips(topics);
  if (notify) document.dispatchEvent(new CustomEvent('topicschange', { detail: topics }));
}

function syncChips(topics: string[]) {
  for (const chip of chips()) chip.setAttribute('aria-pressed', String(topics.includes(chip.dataset.topic!)));
  document.querySelector<HTMLElement>('.chip-clear')?.toggleAttribute('hidden', !topics.length);
  if (topics.length) document.documentElement.dataset.filtering = '';
  else delete document.documentElement.dataset.filtering;
}

const topicLabel = (slug: string) => chips().find((c) => c.dataset.topic === slug)?.textContent ?? slug;
const describe = (topics: string[]) => topics.map(topicLabel).join(' or ');

/** Re-render a filterable listing for the current selection. */
async function renderRiver(river: HTMLElement, topics: string[]) {
  const status = river.querySelector<HTMLElement>('.filter-status')!;
  const target = river.querySelector<HTMLElement>('.river-filtered')!;
  if (!topics.length) {
    status.hidden = target.hidden = true;
    target.innerHTML = '';
    return;
  }
  status.hidden = false;
  status.textContent = 'Filtering…';
  let index;
  try {
    index = await loadIndex();
  } catch {
    status.textContent = 'Filters are unavailable right now.';
    return;
  }
  const category = river.dataset.category;
  const mask = maskFor(index, topics);
  const matches = index.items.filter((i) => (i.k & mask) !== 0 && (!category || index.sources[i.src]?.category === category));

  const feed = topics.length === 1 ? ` <a href="/topics/${topics[0]}/rss.xml">RSS</a>` : '';
  status.innerHTML = `${matches.length} headline${matches.length === 1 ? '' : 's'} about ${describe(topics)}.${feed}`;

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
  if (!matches.length) target.innerHTML = '<p class="empty">Nothing here matches those topics yet.</p>';
}

export function initFilters() {
  if (!chips().length) return;
  const topics = getSelectedTopics();
  // Keep the URL and storage in step with what's shown (e.g. a selection carried over from another page).
  setSelectedTopics(topics, false);

  for (const chip of chips()) {
    chip.addEventListener('click', () => {
      const current = getSelectedTopics();
      const t = chip.dataset.topic!;
      setSelectedTopics(current.includes(t) ? current.filter((x) => x !== t) : [...current, t]);
    });
  }
  document.querySelector('.chip-clear')?.addEventListener('click', () => setSelectedTopics([]));

  const river = document.querySelector<HTMLElement>('.river[data-filterable]');
  if (river) {
    renderRiver(river, topics);
    document.addEventListener('topicschange', (e) => renderRiver(river, (e as CustomEvent<string[]>).detail));
  }
}
