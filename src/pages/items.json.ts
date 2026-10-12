import type { APIRoute } from 'astro';
import { getItems } from '../lib/queries.ts';

// The latest 100 headlines as JSON, for anyone who wants to build on the data.
export const GET: APIRoute = () =>
  Response.json({
    generatedAt: new Date().toISOString(),
    items: getItems({}, 100).map((i) => ({
      title: i.title,
      url: i.url,
      summary: i.summary,
      author: i.author,
      publishedAt: i.publishedAt.toISOString(),
      source: { id: i.source.id, name: i.source.name, category: i.source.category, site: i.source.site },
    })),
  });
