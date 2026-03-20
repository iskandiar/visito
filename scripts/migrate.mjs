import Database from 'better-sqlite3'

const path = process.env.DATABASE_PATH ?? '/data/db.sqlite'
const db = new Database(path)

db.pragma('foreign_keys = ON')
db.exec(`
  CREATE TABLE IF NOT EXISTS passes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    total_entries INTEGER NOT NULL,
    user_link TEXT NOT NULL UNIQUE,
    supervisor_link TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    pass_id TEXT NOT NULL REFERENCES passes(id) ON DELETE CASCADE,
    visit_date TEXT NOT NULL,
    comment TEXT,
    created_at INTEGER NOT NULL
  );
`)

db.close()
console.log('Migration complete:', path)
