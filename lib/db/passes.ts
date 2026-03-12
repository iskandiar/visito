import { eq } from 'drizzle-orm'
import type { DrizzleDb } from './client'
import { passes } from './schema'

export async function createPass(
  db: DrizzleDb,
  data: { name: string; totalEntries: number }
) {
  const id = crypto.randomUUID()
  const userLink = crypto.randomUUID()
  const supervisorLink = crypto.randomUUID()
  await db.insert(passes).values({
    id,
    name: data.name,
    totalEntries: data.totalEntries,
    userLink,
    supervisorLink,
    createdAt: new Date(),
  })
  return { id, userLink, supervisorLink }
}

export async function getPassByUserLink(db: DrizzleDb, userLink: string) {
  const rows = await db.select().from(passes).where(eq(passes.userLink, userLink))
  return rows[0] ?? null
}

export async function getPassBySupervisorLink(db: DrizzleDb, supervisorLink: string) {
  const rows = await db.select().from(passes).where(eq(passes.supervisorLink, supervisorLink))
  return rows[0] ?? null
}
