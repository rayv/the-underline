import type { APIRoute, GetStaticPaths } from 'astro';
import { getItems } from '../../lib/queries.ts';
import { rssResponse } from '../../lib/feed.ts';
import { CATEGORIES, CATEGORY_KEYS, paths, type Category } from '../../lib/sources.ts';

export const getStaticPaths = (() =>
  CATEGORY_KEYS.map((category) => ({ params: { category: CATEGORIES[category].slug }, props: { category } }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ category: Category }> = ({ site, props: { category } }) =>
  rssResponse({ site, path: paths.category(category), scope: CATEGORIES[category].label, items: getItems({ category }, 100) });
