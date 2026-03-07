// lib/db/client.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

export function createDb(url: string = process.env.DATABASE_URL ?? './dev.db'): DrizzleDb {
  // Strip "file:" prefix if present for better-sqlite3
  const path = url.replace(/^file:/, '')
  const sqlite = new Database(path)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  return drizzle(sqlite, { schema })
}

let _db: DrizzleDb | null = null

export function getDb(): DrizzleDb {
  if (!_db) _db = createDb()
  return _db
}
