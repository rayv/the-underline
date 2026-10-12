// The source registry. Every feed here was verified to return a parseable feed;
// run `npm run check-feeds` to re-verify after editing.

export type Category = 'news' | 'vendor' | 'blog' | 'org' | 'watch';

export interface Source {
  id: string;
  name: string;
  site: string;
  feed: string;
  category: Category;
  /** Only keep items whose title/summary match — for broad feeds that aren't higher-ed specific. */
  include?: RegExp;
}

export const CATEGORIES: Record<Category, { label: string; slug: string; blurb: string }> = {
  news: { label: 'News', slug: 'news', blurb: 'Trade press and journalism covering higher ed and ed tech' },
  vendor: { label: 'Vendors', slug: 'vendors', blurb: 'Blogs and newsrooms from companies that build for higher ed' },
  watch: { label: 'Vendor Watch', slug: 'vendor-watch', blurb: 'Press coverage of vendors and outlets that do not publish their own feeds (via Google News)' },
  blog: { label: 'Voices', slug: 'voices', blurb: 'Bloggers, newsletters, and podcasts from people in the field' },
  org: { label: 'Orgs & Research', slug: 'orgs', blurb: 'Associations, consortia, foundations, and research groups' },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];
export const CATEGORY_BY_SLUG = new Map(CATEGORY_KEYS.map((c) => [CATEGORIES[c].slug, c]));

/** Site paths, with trailing slashes to match the static output. */
export const paths = {
  home: (page = 1) => (page > 1 ? `/page/${page}/` : '/'),
  category: (c: Category, page = 1) => `/${CATEGORIES[c].slug}/${page > 1 ? `page/${page}/` : ''}`,
  source: (id: string) => `/source/${id}/`,
  topic: (slug: string, page = 1) => `/topics/${slug}/${page > 1 ? `page/${page}/` : ''}`,
};

const EDU = /\b(higher ed|higher-ed|universit|college|campus|student|faculty|educat|teach|learn|school|academ|edtech)/i;

const googleNews = (query: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

export const SOURCES: Source[] = [
  // ── News ────────────────────────────────────────────────────────────────
  { id: 'insidehighered', name: 'Inside Higher Ed', site: 'https://www.insidehighered.com', feed: 'https://www.insidehighered.com/rss.xml', category: 'news' },
  { id: 'highereddive', name: 'Higher Ed Dive', site: 'https://www.highereddive.com', feed: 'https://www.highereddive.com/feeds/news/', category: 'news' },
  { id: 'highereddive-success', name: 'Higher Ed Dive: Student Success', site: 'https://www.highereddive.com/topic/student-success/', feed: 'https://www.highereddive.com/feeds/topic/student-success/', category: 'news' },
  { id: 'edsurge', name: 'EdSurge', site: 'https://www.edsurge.com', feed: 'https://www.edsurge.com/articles_rss', category: 'news' },
  { id: 'campustechnology', name: 'Campus Technology', site: 'https://campustechnology.com', feed: 'https://campustechnology.com/rss-feeds/news.aspx', category: 'news' },
  { id: 'edtechmagazine', name: 'EdTech Magazine: Higher Ed', site: 'https://edtechmagazine.com/higher', feed: 'https://edtechmagazine.com/higher/rss.xml', category: 'news' },
  { id: 'ecampusnews', name: 'eCampus News', site: 'https://www.ecampusnews.com', feed: 'https://www.ecampusnews.com/feed/', category: 'news' },
  { id: 'hechinger', name: 'The Hechinger Report', site: 'https://hechingerreport.org', feed: 'https://hechingerreport.org/category/higher-education/feed/', category: 'news' },
  { id: 'eduledger', name: 'The EDU Ledger (Diverse)', site: 'https://www.theeduledger.com', feed: 'https://www.theeduledger.com/feed', category: 'news' },
  { id: 'govtech-highered', name: 'GovTech: Higher Ed', site: 'https://www.govtech.com/education/higher-ed', feed: 'https://www.govtech.com/education/higher-ed.rss', category: 'news' },
  { id: 'edscoop', name: 'EdScoop', site: 'https://edscoop.com', feed: 'https://edscoop.com/feed/', category: 'news' },
  { id: 'edtechdigest', name: 'EdTech Digest', site: 'https://www.edtechdigest.com', feed: 'https://www.edtechdigest.com/feed/', category: 'news' },
  { id: 'opencampus', name: 'Open Campus', site: 'https://www.opencampus.org', feed: 'https://www.opencampus.org/feed/', category: 'news' },
  { id: 'workshift', name: 'Work Shift', site: 'https://workshift.org', feed: 'https://workshift.org/feed/', category: 'news' },
  { id: 'classcentral', name: 'Class Central Report', site: 'https://www.classcentral.com/report', feed: 'https://www.classcentral.com/report/feed/', category: 'news' },
  { id: 'thepienews', name: 'The PIE News', site: 'https://thepienews.com', feed: 'https://thepienews.com/feed/', category: 'news' },
  { id: 'wonkhe', name: 'Wonkhe', site: 'https://wonkhe.com', feed: 'https://wonkhe.com/feed', category: 'news' },
  { id: 'conversation-edu', name: 'The Conversation: Education', site: 'https://theconversation.com/us/education', feed: 'https://theconversation.com/us/education/articles.atom', category: 'news' },

  // ── Vendors (first-party feeds) ─────────────────────────────────────────
  { id: 'd2l', name: 'D2L', site: 'https://www.d2l.com/blog/', feed: 'https://www.d2l.com/blog/feed/', category: 'vendor' },
  { id: 'brightspace-community', name: 'D2L Brightspace Community', site: 'https://community.d2l.com/brightspace', feed: 'https://community.d2l.com/brightspace/discussions/feed.rss', category: 'vendor' },
  { id: 'moodle', name: 'Moodle', site: 'https://moodle.com', feed: 'https://moodle.com/feed/', category: 'vendor' },
  { id: 'kaltura', name: 'Kaltura', site: 'https://corp.kaltura.com/blog/', feed: 'https://corp.kaltura.com/blog/feed/', category: 'vendor' },
  { id: 'yuja', name: 'YuJa', site: 'https://www.yuja.com', feed: 'https://www.yuja.com/feed/', category: 'vendor' },
  { id: 'echo360', name: 'Echo360', site: 'https://echo360.com', feed: 'https://echo360.com/feed/', category: 'vendor' },
  { id: 'tophat', name: 'Top Hat', site: 'https://tophat.com', feed: 'https://tophat.com/feed/', category: 'vendor' },
  { id: 'hypothesis', name: 'Hypothesis', site: 'https://web.hypothes.is', feed: 'https://web.hypothes.is/feed/', category: 'vendor' },
  { id: 'packback', name: 'Packback', site: 'https://packback.co', feed: 'https://packback.co/feed/', category: 'vendor' },
  { id: 'watermark', name: 'Watermark', site: 'https://www.watermarkinsights.com', feed: 'https://www.watermarkinsights.com/feed/', category: 'vendor' },
  { id: 'mainstay', name: 'Mainstay', site: 'https://mainstay.com', feed: 'https://mainstay.com/feed/', category: 'vendor' },
  { id: 'pathify', name: 'Pathify', site: 'https://pathify.com', feed: 'https://pathify.com/feed/', category: 'vendor' },
  { id: 'respondus', name: 'Respondus', site: 'https://web.respondus.com', feed: 'https://web.respondus.com/feed/', category: 'vendor' },
  { id: 'lumen', name: 'Lumen Learning', site: 'https://lumenlearning.com', feed: 'https://lumenlearning.com/feed/', category: 'vendor' },
  { id: 'coursera', name: 'Coursera', site: 'https://blog.coursera.org', feed: 'https://blog.coursera.org/feed/', category: 'vendor' },
  { id: 'google-edu', name: 'Google for Education', site: 'https://blog.google/outreach-initiatives/education/', feed: 'https://blog.google/products-and-platforms/products/education/rss/', category: 'vendor' },
  { id: 'microsoft-edu', name: 'Microsoft Education', site: 'https://www.microsoft.com/en-us/education/blog/', feed: 'https://www.microsoft.com/en-us/education/blog/feed/', category: 'vendor' },
  { id: 'salesforce-edu', name: 'Salesforce Education', site: 'https://www.salesforce.com/blog/category/education/', feed: 'https://www.salesforce.com/blog/category/education/feed/', category: 'vendor' },
  { id: 'aws-publicsector', name: 'AWS Public Sector', site: 'https://aws.amazon.com/blogs/publicsector/', feed: 'https://aws.amazon.com/blogs/publicsector/feed/', category: 'vendor', include: EDU },
  { id: 'zoom', name: 'Zoom', site: 'https://www.zoom.com/en/blog/', feed: 'https://www.zoom.com/en/feed/', category: 'vendor', include: EDU },
  { id: 'openai', name: 'OpenAI', site: 'https://openai.com/news/', feed: 'https://openai.com/news/rss.xml', category: 'vendor', include: EDU },

  // ── Vendor Watch (Google News queries for vendors/outlets without usable feeds)
  { id: 'gn-instructure', name: 'Instructure / Canvas', site: 'https://www.instructure.com', feed: googleNews('"Instructure" OR "Canvas LMS"'), category: 'watch' },
  { id: 'gn-ellucian', name: 'Ellucian', site: 'https://www.ellucian.com', feed: googleNews('"Ellucian"'), category: 'watch' },
  { id: 'gn-anthology', name: 'Anthology / Blackboard', site: 'https://www.anthology.com', feed: googleNews('Blackboard LMS'), category: 'watch' },
  { id: 'gn-eab', name: 'EAB / Navigate360', site: 'https://eab.com', feed: googleNews('"EAB" (Navigate OR "student success")'), category: 'watch' },
  { id: 'gn-civitas', name: 'Civitas Learning', site: 'https://www.civitaslearning.com', feed: googleNews('"Civitas Learning"'), category: 'watch' },
  { id: 'gn-element451', name: 'Element451', site: 'https://element451.com', feed: googleNews('"Element451"'), category: 'watch' },
  { id: 'gn-unizin', name: 'Unizin', site: 'https://unizin.org', feed: googleNews('"Unizin"'), category: 'watch' },
  { id: 'gn-turnitin', name: 'Turnitin', site: 'https://www.turnitin.com', feed: googleNews('"Turnitin"'), category: 'watch' },
  { id: 'gn-1edtech', name: '1EdTech', site: 'https://www.1edtech.org', feed: googleNews('"1EdTech"'), category: 'watch' },
  { id: 'gn-chronicle', name: 'The Chronicle of Higher Education', site: 'https://www.chronicle.com', feed: googleNews('site:chronicle.com/article'), category: 'watch' },
  { id: 'gn-educause-review', name: 'EDUCAUSE Review', site: 'https://er.educause.edu', feed: googleNews('site:er.educause.edu'), category: 'watch' },

  // ── Voices ──────────────────────────────────────────────────────────────
  { id: 'eliterate', name: 'e-Literate (Michael Feldstein)', site: 'https://eliterate.us', feed: 'https://eliterate.us/feed/', category: 'blog' },
  { id: 'oldaily', name: 'OLDaily (Stephen Downes)', site: 'https://www.downes.ca', feed: 'https://www.downes.ca/news/OLDaily.xml', category: 'blog' },
  { id: 'halfanhour', name: 'Half an Hour (Stephen Downes)', site: 'https://halfanhour.blogspot.com', feed: 'https://halfanhour.blogspot.com/feeds/posts/default', category: 'blog' },
  { id: 'tonybates', name: 'Tony Bates', site: 'https://www.tonybates.ca', feed: 'https://www.tonybates.ca/feed/', category: 'blog' },
  { id: 'bryanalexander', name: 'Bryan Alexander', site: 'https://bryanalexander.org', feed: 'https://bryanalexander.org/feed/', category: 'blog' },
  { id: 'audreywatters', name: 'Second Breakfast (Audrey Watters)', site: 'https://2ndbreakfast.audreywatters.com', feed: 'https://2ndbreakfast.audreywatters.com/rss/', category: 'blog' },
  { id: 'edtechie', name: 'The Ed Techie (Martin Weller)', site: 'https://blog.edtechie.net', feed: 'https://blog.edtechie.net/feed/', category: 'blog' },
  { id: 'bavatuesdays', name: 'bavatuesdays (Jim Groom)', site: 'https://bavatuesdays.com', feed: 'https://bavatuesdays.com/feed/', category: 'blog' },
  { id: 'cogdog', name: 'CogDogBlog (Alan Levine)', site: 'https://cogdogblog.com', feed: 'https://cogdogblog.com/feed/', category: 'blog' },
  { id: 'mahabali', name: 'Maha Bali', site: 'https://blog.mahabali.me', feed: 'https://blog.mahabali.me/feed/', category: 'blog' },
  { id: 'kelchen', name: 'Kelchen on Education (Robert Kelchen)', site: 'https://robertkelchen.com', feed: 'https://robertkelchen.com/feed/', category: 'blog' },
  { id: 'oneusefulthing', name: 'One Useful Thing (Ethan Mollick)', site: 'https://www.oneusefulthing.org', feed: 'https://www.oneusefulthing.org/feed', category: 'blog' },
  { id: 'lanceeaton', name: 'AI + Education = Simplified (Lance Eaton)', site: 'https://aiedusimplified.substack.com', feed: 'https://aiedusimplified.substack.com/feed', category: 'blog' },
  { id: 'marcwatkins', name: 'Rhetorica (Marc Watkins)', site: 'https://marcwatkins.substack.com', feed: 'https://marcwatkins.substack.com/feed', category: 'blog' },
  { id: 'joshbrake', name: 'The Absent-Minded Professor (Josh Brake)', site: 'https://joshbrake.substack.com', feed: 'https://joshbrake.substack.com/feed', category: 'blog' },
  { id: 'michaelhorn', name: 'Michael B. Horn', site: 'https://michaelbhorn.substack.com', feed: 'https://michaelbhorn.substack.com/feed', category: 'blog' },
  { id: 'mikecaulfield', name: 'Mike Caulfield', site: 'https://mikecaulfield.substack.com', feed: 'https://mikecaulfield.substack.com/feed', category: 'blog' },
  { id: 'annamills', name: 'Anna Mills', site: 'https://annamills.substack.com', feed: 'https://annamills.substack.com/feed', category: 'blog' },
  { id: 'derekbruff', name: 'Agile Learning (Derek Bruff)', site: 'https://derekbruff.org', feed: 'https://derekbruff.org/feed/', category: 'blog' },
  { id: 'leonfurze', name: 'Leon Furze', site: 'https://leonfurze.com', feed: 'https://leonfurze.com/feed/', category: 'blog' },
  { id: 'donaldclark', name: 'Plan B (Donald Clark)', site: 'https://donaldclarkplanb.blogspot.com', feed: 'https://donaldclarkplanb.blogspot.com/feeds/posts/default', category: 'blog' },
  { id: 'guzdial', name: 'Computing Ed Research (Mark Guzdial)', site: 'https://computinged.wordpress.com', feed: 'https://computinged.wordpress.com/feed/', category: 'blog' },
  { id: 'danmeyer', name: 'Dan Meyer', site: 'https://danmeyer.substack.com', feed: 'https://danmeyer.substack.com/feed', category: 'blog' },
  { id: 'teachinginhighered', name: 'Teaching in Higher Ed (Bonni Stachowiak)', site: 'https://teachinginhighered.com', feed: 'https://teachinginhighered.com/feed/', category: 'blog' },
  { id: 'teaforteaching', name: 'Tea for Teaching', site: 'https://teaforteaching.com', feed: 'https://teaforteaching.com/feed/', category: 'blog' },

  // ── Orgs & Research ─────────────────────────────────────────────────────
  { id: 'ithaka', name: 'Ithaka S+R', site: 'https://sr.ithaka.org', feed: 'https://sr.ithaka.org/feed/', category: 'org' },
  { id: 'internet2', name: 'Internet2', site: 'https://internet2.edu', feed: 'https://internet2.edu/feed/', category: 'org' },
  { id: 'olc', name: 'Online Learning Consortium', site: 'https://onlinelearningconsortium.org', feed: 'https://onlinelearningconsortium.org/feed/', category: 'org' },
  { id: 'qualitymatters', name: 'Quality Matters', site: 'https://www.qualitymatters.org', feed: 'https://www.qualitymatters.org/rss.xml', category: 'org' },
  { id: 'openedx', name: 'Open edX', site: 'https://openedx.org', feed: 'https://openedx.org/feed/', category: 'org' },
  { id: 'everylearner', name: 'Every Learner Everywhere', site: 'https://www.everylearnereverywhere.org', feed: 'https://www.everylearnereverywhere.org/feed/', category: 'org' },
  { id: 'atd', name: 'Achieving the Dream', site: 'https://achievingthedream.org', feed: 'https://achievingthedream.org/feed/', category: 'org' },
  { id: 'sheeo', name: 'SHEEO', site: 'https://sheeo.org', feed: 'https://sheeo.org/feed/', category: 'org' },
  { id: 'digitalpromise', name: 'Digital Promise', site: 'https://digitalpromise.org', feed: 'https://digitalpromise.org/feed/', category: 'org' },
  { id: 'cast', name: 'CAST', site: 'https://www.cast.org', feed: 'https://www.cast.org/feed/', category: 'org' },
  { id: 'sparc', name: 'SPARC', site: 'https://sparcopen.org', feed: 'https://sparcopen.org/feed/', category: 'org' },
  { id: 'lumina', name: 'Lumina Foundation', site: 'https://www.luminafoundation.org', feed: 'https://www.luminafoundation.org/news-and-views/feed/', category: 'org' },
  { id: 'nsc-research', name: 'National Student Clearinghouse Research Center', site: 'https://nscresearchcenter.org', feed: 'https://nscresearchcenter.org/feed/', category: 'org' },
  { id: 'ihep', name: 'Institute for Higher Education Policy', site: 'https://www.ihep.org', feed: 'https://www.ihep.org/feed/', category: 'org' },
  { id: 'tyton', name: 'Tyton Partners', site: 'https://tytonpartners.com', feed: 'https://tytonpartners.com/feed/', category: 'org' },
  { id: 'oeglobal', name: 'Open Education Global', site: 'https://www.oeglobal.org', feed: 'https://www.oeglobal.org/feed/', category: 'org' },
];

export const SOURCE_BY_ID = new Map(SOURCES.map((s) => [s.id, s]));
