// Export recent items and fetch status for `local` sources as JSON, for the daily workflow to import.
// Usage: DB_PATH=data/local.db node scripts/export-local.ts > local-items.json
import { db } from '../src/lib/db.ts';
import { SOURCES } from '../src/lib/sources.ts';

const ids = SOURCES.filter((s) => s.local).map((s) => s.id);
const placeholders = ids.map(() => '?').join(',');
const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

const items = db
  .prepare(
    `SELECT source_id, guid, url, title, summary, author, published_at, fetched_at
     FROM items WHERE source_id IN (${placeholders}) AND fetched_at > ? ORDER BY published_at DESC`,
  )
  .all(...ids, since);
const status = db
  .prepare(`SELECT source_id, last_attempt, last_success, last_error FROM source_status WHERE source_id IN (${placeholders})`)
  .all(...ids);

process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), items, status }, null, 1) + '\n');
