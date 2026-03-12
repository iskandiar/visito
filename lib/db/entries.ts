import { eq, count, asc } from 'drizzle-orm'
import type { DrizzleDb } from './client'
import { entries } from './schema'

export async function addEntry(
  db: DrizzleDb,
  data: { passId: string; visitDate: string; comment?: string }
) {
  const id = crypto.randomUUID()
  await db.insert(entries).values({
    id,
    passId: data.passId,
    visitDate: data.visitDate,
    comment: data.comment ?? null,
    createdAt: new Date(),
  })
  return id
}

export async function getEntry(db: DrizzleDb, entryId: string) {
  const rows = await db.select().from(entries).where(eq(entries.id, entryId))
  return rows[0] ?? null
}

export async function getEntriesForPass(db: DrizzleDb, passId: string) {
  return db
    .select()
    .from(entries)
    .where(eq(entries.passId, passId))
    .orderBy(asc(entries.createdAt))
}

export async function countEntriesForPass(db: DrizzleDb, passId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(entries)
    .where(eq(entries.passId, passId))
  return result[0]?.count ?? 0
}

export async function updateEntry(
  db: DrizzleDb,
  entryId: string,
  data: { visitDate?: string; comment?: string | null }
) {
  await db.update(entries)
    .set({
      ...(data.visitDate !== undefined && { visitDate: data.visitDate }),
      ...(data.comment !== undefined && { comment: data.comment }),
    })
    .where(eq(entries.id, entryId))
}

export async function deleteEntry(db: DrizzleDb, entryId: string) {
  await db.delete(entries).where(eq(entries.id, entryId))
}
