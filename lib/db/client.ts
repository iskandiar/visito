// lib/db/client.ts
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

export function createDb(url: string = process.env.DATABASE_URL!): DrizzleDb {
  const client = postgres(url)
  return drizzle(client, { schema })
}

let _db: DrizzleDb | null = null

export function getDb(): DrizzleDb {
  if (!_db) _db = createDb()
  return _db
}
