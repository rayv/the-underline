import type { APIRoute } from 'astro';
import { getItems } from '../lib/queries.ts';
import { rssResponse } from '../lib/feed.ts';

export const GET: APIRoute = ({ site }) => rssResponse({ site, path: '/', items: getItems({}, 100) });
