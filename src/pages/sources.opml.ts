import type { APIRoute } from 'astro';
import { CATEGORIES, CATEGORY_KEYS, SOURCES } from '../lib/sources.ts';
import { SITE_NAME } from '../lib/format.ts';

const xml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

// Every source feed, grouped by section, for import into a feed reader. JSON API sources are left out; readers can't use them.
export const GET: APIRoute = () => {
  const groups = CATEGORY_KEYS.map(
    (cat) => `    <outline text="${xml(CATEGORIES[cat].label)}">
${SOURCES.filter((s) => s.category === cat && !s.format)
  .map((s) => `      <outline type="rss" text="${xml(s.name)}" title="${xml(s.name)}" xmlUrl="${xml(s.feed)}" htmlUrl="${xml(s.site)}"/>`)
  .join('\n')}
    </outline>`,
  ).join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>${xml(SITE_NAME)} sources</title></head>
  <body>
${groups}
  </body>
</opml>
`,
    { headers: { 'content-type': 'text/x-opml; charset=utf-8' } },
  );
};
