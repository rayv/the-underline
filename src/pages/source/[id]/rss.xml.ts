import type { APIRoute, GetStaticPaths } from 'astro';
import { getItems } from '../../../lib/queries.ts';
import { rssResponse } from '../../../lib/feed.ts';
import { SOURCES, paths, type Source } from '../../../lib/sources.ts';

export const getStaticPaths = (() => SOURCES.map((source) => ({ params: { id: source.id }, props: { source } }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ source: Source }> = ({ site, props: { source } }) =>
  rssResponse({ site, path: paths.source(source.id), scope: source.name, items: getItems({ sourceId: source.id }, 100) });
