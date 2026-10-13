// Topics cut across sections. They power the filter chips on every listing, and each also gets its own
// page and RSS feed at /topics/<slug>/. An item belongs to a topic if:
//   - its category is in `excludeCategories` → never, otherwise
//   - its category is in `categories` or its source is in `sources` → always, otherwise
//   - its headline/summary matches `pattern`.
// Keyword rules need tuning: audit what a change catches before shipping it (see README → Topics).

import type { Item } from './queries.ts';
import type { Category } from './sources.ts';

export interface Topic {
  slug: string;
  label: string;
  blurb: string;
  pattern: RegExp;
  categories?: Category[];
  excludeCategories?: Category[];
  sources?: string[];
  /** Items matching this are never in the topic, whatever their source. */
  exclude?: RegExp;
}

// Whole-word match on each alternative, so short terms like "AI" don't match "aid" or "aims".
const anyOf = (parts: string[]) => new RegExp(`\\b(?:${parts.join('|')})\\b`, 'i');

export const TOPICS: Topic[] = [
  {
    slug: 'higher-ed',
    label: 'Higher Ed',
    blurb: 'How institutions are run: policy, funding, enrollment, governance, labor, and the sector at large',
    // Vendor marketing talks about "enrollment" and "budgets" constantly; it isn't sector news.
    excludeCategories: ['vendor'],
    // Mixed-audience outlets carry K-12 district stories that hit words like "enrollment" and "budget".
    exclude: anyOf(['K-?12', 'school districts?', 'district schools', 'kindergarten', 'elementary', 'middle schools?', 'pre-?K']),
    sources: [
      'highereddive', 'gn-chronicle', 'sheeo', 'ihep', 'lumina', 'nsc-research', 'opencampus', 'workshift', 'wonkhe', 'thepienews', 'kelchen',
      'rihe', 'jhe', 'ccr',
    ],
    pattern: anyOf([
      // policy and government
      // Not "self-regulated learning", which is all over ed tech research.
    'polic(?:y|ies)', 'federal', 'congress', 'senate', 'lawmakers?', 'legislat\\w*', '(?<!self-)regulat\\w*',
      '(?:Department|Dept\\.?) of Education', 'Education Department', 'White House', 'Trump administration', 'executive orders?',
      'Title (?:IV|IX|VI)', 'FAFSA', 'Pell', 'student loans?', 'loan forgiveness', 'accredit\\w*', 'compliance',
      // money
      'budgets?', 'funding', 'appropriations', 'tuition', 'endowments?', 'financ\\w*', 'deficits?', 'cuts', 'layoffs?', 'furlough\\w*',
      'bankrupt\\w*', 'closures?', 'clos(?:e|es|ing) (?:its doors|campus\\w*)', 'merg(?:er|ers|e|es|ing)', 'consolidat\\w*',
      'research funding', 'grants?', 'indirect costs', 'NIH', 'NSF',
      // enrollment and access
      'enrollments?', 'admissions?', 'demographic cliff', 'international students?', 'visas?', 'affirmative action',
      // governance and labor
      'presidents?', 'provosts?', 'chancellors?', 'trustees', 'regents', 'board of (?:trustees|regents|governors)',
      '(?:shared|board|institutional|university|college|campus) governance',
      'tenure', 'unions?', 'strikes?', 'collective bargaining', 'adjuncts?', 'academic freedom', 'free speech', 'DEI',
      // the sector
      'community colleges?', 'HBCUs?', 'public universit(?:y|ies)', 'flagships?', 'workforce', 'value of (?:a )?(?:college|degree)', 'ROI', 'rankings?',
    ]),
  },
  {
    slug: 'ed-tech',
    label: 'Ed Tech',
    blurb: 'The tools, platforms, and AI shaping teaching, learning, and campus operations',
    categories: ['vendor'],
    sources: [
      // Vendor Watch searches (but not the Chronicle, which is in that section too)
      'gn-instructure', 'gn-ellucian', 'gn-anthology', 'gn-unizin', 'gn-turnitin', 'gn-1edtech', 'gn-educause-review',
      'gn-eab', 'gn-civitas', 'gn-element451',
      'campustechnology', 'edtechmagazine', 'ecampusnews', 'edscoop', 'govtech-highered', 'edtechdigest', 'classcentral',
      'internet2', 'olc', 'qualitymatters', 'openedx', 'oeglobal', 'everylearner',
      'oldaily', 'halfanhour', 'tonybates', 'eliterate', 'audreywatters', 'edtechie', 'bavatuesdays', 'cogdog', 'oneusefulthing',
      'lanceeaton', 'marcwatkins', 'leonfurze', 'annamills', 'donaldclark',
      // Research journals and preprints
      'jla', 'jedm', 'irrodl', 'olj', 'ijethe', 'iheduc', 'compedu', 'compedu-open', 'compedu-ai', 'bjet', 'etrd', 'ajet', 'arxiv-highered',
    ],
    pattern: anyOf([
      'ed ?tech', 'LMS', 'learning management', 'courseware', 'OPMs?', 'online (?:learning|courses?|programs?|education)', 'digital (?:learning|tools?|transformation|credentials?)',
      'AI', 'artificial intelligence', 'generative', 'GenAI', 'ChatGPT', 'chatbots?', 'LLMs?', 'large language models?', 'agentic',
      'software', 'platforms?', 'apps?', 'cloud', 'cyber\\w*', 'ransomware', 'data breach\\w*', 'hack\\w*', 'analytics', 'dashboards?',
      'tech(?:nology|nologies)?', 'proctor\\w*', 'e-?textbooks?', 'OER', 'open educational resources', 'VR', 'virtual reality', 'XR',
      'Canvas', 'Blackboard', 'Moodle', 'D2L', 'Brightspace', 'Instructure', 'Ellucian', 'Workday', 'PeopleSoft',
      'Turnitin', 'Coursera', 'edX', 'Zoom', 'Microsoft', 'Google', 'OpenAI', 'Anthropic', 'Gemini', 'Copilot',
    ]),
  },
  {
    slug: 'student-success',
    label: 'Student Success',
    blurb: 'Retention, completion, advising, basic needs, and the tools and research behind them',
    sources: [
      'highereddive-success', 'everylearner', 'atd', 'nsc-research', 'mainstay', 'gn-eab', 'gn-civitas',
      // Research journals
      'jcsr', 'ssj', 'jcsd', 'jsarp', 'ccr',
    ],
    pattern: anyOf(
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
      ],
    ),
  },
];

export const TOPIC_BY_SLUG = new Map(TOPICS.map((t) => [t.slug, t]));

export function inTopic(topic: Topic, item: Item): boolean {
  const { category, id } = item.source;
  if (topic.excludeCategories?.includes(category)) return false;
  if (topic.exclude?.test(`${item.title} ${item.summary ?? ''}`)) return false;
  if (topic.categories?.includes(category) || topic.sources?.includes(id)) return true;
  return topic.pattern.test(`${item.title} ${item.summary ?? ''}`);
}

/** Bitmask of the topics an item belongs to, in TOPICS order (bit 0 = TOPICS[0]). Used by search.json. */
export const topicMask = (item: Item) => TOPICS.reduce((mask, t, i) => (inTopic(t, item) ? mask | (1 << i) : mask), 0);
