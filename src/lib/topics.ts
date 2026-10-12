// Topics cut across sections: a topic page collects matching headlines from every source.
// An item belongs to a topic if its source is listed in `sources` (sources that only cover the topic),
// or its headline/summary matches `pattern`.

import type { Item } from './queries.ts';

export interface Topic {
  slug: string;
  label: string;
  blurb: string;
  pattern: RegExp;
  sources?: string[];
}

export const TOPICS: Topic[] = [
  {
    slug: 'student-success',
    label: 'Student Success',
    blurb: 'Retention, completion, advising, basic needs, and the tools and research behind them',
    sources: ['highereddive-success', 'everylearner', 'atd', 'nsc-research', 'mainstay', 'gn-eab', 'gn-civitas'],
    pattern: new RegExp(
      [
        'student success',
        // Bare "retention" also catches data, records, and staff retention stories, so require a student context.
        'student retention',
        'retention (?:rates?|strateg\\w*|efforts?|initiatives?|gaps?|and (?:completion|graduation|persistence))',
        'persistence',
        '(?:college|degree|course|on-time|credential) completion',
        'completion (?:rates?|gaps?|agenda)',
        'graduation rates?',
        'academic advis\\w*',
        'advising',
        'early[- ]alert',
        'first[- ]gen(?:eration)?',
        'basic needs',
        '(?:food|housing) insecur\\w*',
        'stop(?:ped)?[- ]?outs?',
        'some college,? no credential',
        're-?enroll\\w*',
        'transfer (?:students?|credits?|pathways?)',
        'credit momentum',
        'guided pathways',
        'student (?:mental health|well-?being)',
        'Navigate360',
        'Starfish',
      ]
        .map((p) => `\\b${p}`)
        .join('|'),
      'i',
    ),
  },
];

export const TOPIC_BY_SLUG = new Map(TOPICS.map((t) => [t.slug, t]));

export const inTopic = (topic: Topic, item: Item) =>
  !!topic.sources?.includes(item.source.id) || topic.pattern.test(`${item.title} ${item.summary ?? ''}`);
