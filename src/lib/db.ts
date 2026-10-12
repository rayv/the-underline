import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH ?? 'data/news.db';
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS items (
    id           INTEGER PRIMARY KEY,
    source_id    TEXT NOT NULL,
    guid         TEXT NOT NULL,
    url          TEXT NOT NULL,
    title        TEXT NOT NULL,
    summary      TEXT,
    author       TEXT,
    published_at TEXT NOT NULL,
    fetched_at   TEXT NOT NULL,
    UNIQUE (source_id, guid)
  );
  CREATE INDEX IF NOT EXISTS items_published ON items (published_at DESC);
  CREATE INDEX IF NOT EXISTS items_source ON items (source_id, published_at DESC);
  CREATE INDEX IF NOT EXISTS items_url ON items (url);

  CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    title, summary, content='items', content_rowid='id'
  );
  CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
    INSERT INTO items_fts (rowid, title, summary) VALUES (new.id, new.title, new.summary);
  END;
  CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
    INSERT INTO items_fts (items_fts, rowid, title, summary) VALUES ('delete', old.id, old.title, old.summary);
  END;

  CREATE TABLE IF NOT EXISTS source_status (
    source_id      TEXT PRIMARY KEY,
    etag           TEXT,
    last_modified  TEXT,
    last_attempt   TEXT,
    last_success   TEXT,
    last_error     TEXT,
    item_count     INTEGER DEFAULT 0
  );
`);
