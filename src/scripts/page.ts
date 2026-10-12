// Client-side behavior for every page. The site is rebuilt once a day, so anything relative to "now"
// (relative times, Today/Yesterday, New and Major badges) is computed here rather than baked into the HTML.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function ago(d: Date, now = Date.now()): string {
  const mins = Math.round((now - d.getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initThemeToggle() {
  const root = document.documentElement;
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const system = () => (mq.matches ? 'dark' : 'light');
  const current = () => root.dataset.theme || system();
  const label = () => {
    const text = current() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    btn.setAttribute('aria-label', text);
    btn.title = text;
  };
  // Picking the theme that matches the system clears the override, so the page follows the OS again.
  btn.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    const followSystem = next === system();
    if (followSystem) delete root.dataset.theme;
    else root.dataset.theme = next;
    try {
      if (followSystem) localStorage.removeItem('theme');
      else localStorage.setItem('theme', next);
    } catch {}
    label();
  });
  mq.addEventListener('change', label);
  label();
}

/** Relative times, plus "Today"/"Yesterday" day headings in the site's timezone. */
export function refreshTimes(scope: ParentNode = document) {
  const now = Date.now();
  for (const el of scope.querySelectorAll<HTMLTimeElement>('time[data-relative]')) {
    el.textContent = ago(new Date(el.dateTime), now);
  }
  const tz = document.documentElement.dataset.tz;
  const key = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: tz });
  const today = key(new Date(now));
  const yesterday = key(new Date(now - DAY));
  for (const el of scope.querySelectorAll<HTMLElement>('[data-day]')) {
    if (el.dataset.day === today) el.textContent = 'Today';
    else if (el.dataset.day === yesterday) el.textContent = 'Yesterday';
  }
}

// "New" = arrived since your previous visit (a visit ends after 30 idle minutes); on a first visit,
// anything published in the last day.
let visit: { since: number; first: boolean } | undefined;

function trackVisit() {
  const now = Date.now();
  let v: { since?: number; active?: number; first?: boolean } = {};
  try {
    v = JSON.parse(localStorage.getItem('visit') || '{}');
  } catch {}
  // A new visit starts on the first page view ever, or after 30 idle minutes. The whole first visit
  // uses publish time, because arrival times say nothing to someone who has never been here.
  if (!v.active || now - v.active > 30 * 60_000) {
    v.first = !v.active;
    v.since = v.active ?? now - DAY;
  }
  v.active = now;
  try {
    localStorage.setItem('visit', JSON.stringify(v));
  } catch {}
  visit = { since: v.since!, first: v.first ?? false };
}

/** Show New badges, and give "Major" candidates the tomato treatment for their first 48 hours. */
export function markItems(scope: ParentNode = document) {
  if (!visit) trackVisit();
  const { since, first } = visit!;
  const now = Date.now();
  for (const el of scope.querySelectorAll<HTMLElement>('.item[data-published]')) {
    const published = Date.parse(el.dataset.published!);
    const t = first ? published : Date.parse(el.dataset.arrived!);
    if (t > since && published > now - 7 * DAY) el.querySelector('.badge-new')?.removeAttribute('hidden');
    if (el.dataset.major !== undefined && now - published < 48 * HOUR) {
      el.classList.add('is-major');
      el.querySelector('.badge-major')?.removeAttribute('hidden');
    }
  }
}

export function initPage() {
  trackVisit();
  initThemeToggle();
  refreshTimes();
  markItems();
}
