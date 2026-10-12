// Import items fetched on the maintainer's Mac (see scripts/export-local.ts) into the main database.
// Usage: node scripts/import-local.ts local-items.json
import { readFileSync } from 'node:fs';
import { db } from '../src/lib/db.ts';

interface Export {
  generatedAt: string;
  items: { source_id: string; guid: string; url: string; title: string; summary: string | null; author: string | null; published_at: string; fetched_at: string }[];
  status: { source_id: string; last_attempt: string | null; last_success: string | null; last_error: string | null }[];
}

const data = JSON.parse(readFileSync(process.argv[2], 'utf8')) as Export;
const ageDays = (Date.now() - Date.parse(data.generatedAt)) / 86_400_000;

const insert = db.prepare(`
  INSERT OR IGNORE INTO items (source_id, guid, url, title, summary, author, published_at, fetched_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const upsertStatus = db.prepare(`
  INSERT INTO source_status (source_id, last_attempt, last_success, last_error, item_count)
  VALUES (?, ?, ?, ?, (SELECT count(*) FROM items WHERE source_id = ?))
  ON CONFLICT (source_id) DO UPDATE SET
    last_attempt = excluded.last_attempt,
    last_success = coalesce(excluded.last_success, last_success),
    last_error = excluded.last_error,
    item_count = excluded.item_count
`);

let added = 0;
for (const i of data.items) {
  added += Number(insert.run(i.source_id, i.guid, i.url, i.title, i.summary, i.author, i.published_at, i.fetched_at).changes);
}
for (const s of data.status) upsertStatus.run(s.source_id, s.last_attempt, s.last_success, s.last_error, s.source_id);

console.log(`Imported ${added} new items (${data.items.length} in file) for ${data.status.length} local sources; export is ${ageDays.toFixed(1)} days old.`);
if (ageDays > 3) {
  // Surfaces as a warning annotation on the workflow run.
  console.log(`::warning::Local feeds were last fetched ${ageDays.toFixed(1)} days ago. Is the Mac's local-fetch job running?`);
}

db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
db.close();
