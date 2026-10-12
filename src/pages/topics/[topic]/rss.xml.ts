import type { APIRoute, GetStaticPaths } from 'astro';
import { getItems } from '../../../lib/queries.ts';
import { rssResponse } from '../../../lib/feed.ts';
import { paths } from '../../../lib/sources.ts';
import { TOPICS, inTopic, type Topic } from '../../../lib/topics.ts';

export const getStaticPaths = (() => TOPICS.map((topic) => ({ params: { topic: topic.slug }, props: { topic } }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ topic: Topic }> = ({ site, props: { topic } }) =>
  rssResponse({ site, path: paths.topic(topic.slug), scope: topic.label, items: getItems().filter((i) => inTopic(topic, i)) });
