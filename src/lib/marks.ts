// Headline highlighting, shared by the build (ItemRow) and the browser (filtered lists, search).
// Pure functions only: this module is bundled into client scripts.

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// Tracked names get a highlighter mark in headlines. Only the first match is marked, so it stays a mark, not a fill.
const TRACKED =
  /\b(Instructure|Canvas|D2L|Brightspace|Ellucian|Anthology|Blackboard|Unizin|Moodle|Turnitin|1EdTech|Coursera|EDUCAUSE|Kaltura|Workday)\b/i;

/**
 * Headline as HTML with <mark>s: every word starting with a search term when `terms` is given,
 * otherwise the first tracked name.
 */
export function markedTitle(title: string, terms: string[] = []): string {
  const ranges: [number, number][] = [];
  if (terms.length) {
    const re = new RegExp(`\\b(?:${terms.join('|')})[\\p{L}\\p{N}]*`, 'giu');
    for (const m of title.matchAll(re)) ranges.push([m.index, m.index + m[0].length]);
  } else {
    const m = TRACKED.exec(title);
    if (m) ranges.push([m.index, m.index + m[0].length]);
  }
  let out = '';
  let pos = 0;
  for (const [a, b] of ranges) {
    out += `${escapeHtml(title.slice(pos, a))}<mark>${escapeHtml(title.slice(a, b))}</mark>`;
    pos = b;
  }
  return out + escapeHtml(title.slice(pos));
}
