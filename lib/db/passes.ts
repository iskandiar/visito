import { eq } from 'drizzle-orm'
import type { DrizzleDb } from './client'
import { passes } from './schema'

export function createPass(
  db: DrizzleDb,
  data: { name: string; totalEntries: number }
) {
  const id = crypto.randomUUID()
  const userLink = crypto.randomUUID()
  const supervisorLink = crypto.randomUUID()
  const result = db.insert(passes)
    .values({ id, name: data.name, totalEntries: data.totalEntries, userLink, supervisorLink, createdAt: new Date() })
    .run()
  if (result.changes !== 1) {
    throw new Error('Failed to create pass')
  }
  return { id, userLink, supervisorLink }
}

export function getPassByUserLink(db: DrizzleDb, userLink: string) {
  return db.select().from(passes).where(eq(passes.userLink, userLink)).get()
}

export function getPassBySupervisorLink(db: DrizzleDb, supervisorLink: string) {
  return db.select().from(passes).where(eq(passes.supervisorLink, supervisorLink)).get()
}
