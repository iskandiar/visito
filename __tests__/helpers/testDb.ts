// __tests__/helpers/testDb.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '@/lib/db/schema'

export function createTestDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  sqlite.exec(`
    CREATE TABLE passes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      total_entries INTEGER NOT NULL,
      user_link TEXT NOT NULL UNIQUE,
      supervisor_link TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE entries (
      id TEXT PRIMARY KEY,
      pass_id TEXT NOT NULL REFERENCES passes(id) ON DELETE CASCADE,
      visit_date TEXT NOT NULL,
      comment TEXT,
      created_at INTEGER NOT NULL
    );
  `)
  return drizzle(sqlite, { schema })
}

export type TestDb = ReturnType<typeof createTestDb>
