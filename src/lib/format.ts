import type { Item } from './queries.ts';

export const SITE_NAME = 'The Underline';
export const SITE_DESCRIPTION =
  'Underlining what matters in higher ed and ed tech: news, vendor updates, and commentary from across the field, in one place.';
/** Timezone used to group headlines into days. The browser relabels "Today"/"Yesterday" using the same zone. */
export const SITE_TZ = process.env.SITE_TZ ?? 'America/Los_Angeles';
export const PAGE_SIZE = 50;
export const MAX_PAGES = 10;

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Calendar date in the site timezone, e.g. "2026-10-09". */
export const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: SITE_TZ });

export const longDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: SITE_TZ });

export const shortDateTime = (d: Date) =>
  d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: SITE_TZ });

export function groupByDay(items: Item[]): { key: string; label: string; items: Item[] }[] {
  const groups: { key: string; label: string; items: Item[] }[] = [];
  for (const item of items) {
    const key = dayKey(item.publishedAt);
    if (groups.at(-1)?.key !== key) groups.push({ key, label: longDate(item.publishedAt), items: [] });
    groups.at(-1)!.items.push(item);
  }
  return groups;
}

// Tracked names get a highlighter mark in headlines. Only the first match is marked, so it stays a mark, not a fill.
const TRACKED =
  /\b(Instructure|Canvas|D2L|Brightspace|Ellucian|Anthology|Blackboard|Unizin|Moodle|Turnitin|1EdTech|Coursera|EDUCAUSE|Kaltura|Workday)\b/i;

/** Headline as HTML with the first tracked name wrapped in <mark>. */
export function markedTitle(title: string): string {
  const m = TRACKED.exec(title);
  if (!m) return escapeHtml(title);
  const end = m.index + m[0].length;
  return `${escapeHtml(title.slice(0, m.index))}<mark>${escapeHtml(m[0])}</mark>${escapeHtml(title.slice(end))}`;
}

// Tomato is reserved for major news: big-deal keywords in a News or Vendor Watch headline.
// It's a keyword heuristic, so expect to tune this list. Vendor blogs are excluded because they discuss
// breaches and ransomware as marketing topics. The browser only shows the badge for the first 48 hours.
const MAJOR =
  /\b(acquires?|acquired|acquisition|merger|breach(es|ed)?|data leak|ransomware|cyberattack|outage|layoffs?|lays off|bankrupt(cy)?|shuts? down|closure|lawsuit|sues|indicted)\b/i;

export const isMajorCandidate = (item: Item) =>
  (item.source.category === 'news' || item.source.category === 'watch') && MAJOR.test(item.title);

/** Static paths for pages 2..N of a listing. */
export function pageNumbers(total: number): number[] {
  const pages = Math.min(MAX_PAGES, Math.ceil(total / PAGE_SIZE));
  return Array.from({ length: Math.max(0, pages - 1) }, (_, i) => i + 2);
}

export const pageSlice = <T,>(items: T[], page: number) => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
