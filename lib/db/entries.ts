import { eq, count, asc } from 'drizzle-orm'
import type { DrizzleDb } from './client'
import { entries } from './schema'

export function addEntry(
  db: DrizzleDb,
  data: { passId: string; visitDate: string; comment?: string }
) {
  const id = crypto.randomUUID()
  db.insert(entries).values({
    id,
    passId: data.passId,
    visitDate: data.visitDate,
    comment: data.comment ?? null,
    createdAt: new Date(),
  }).run()
  return id
}

export function getEntry(db: DrizzleDb, entryId: string) {
  return db.select().from(entries).where(eq(entries.id, entryId)).get()
}

export function getEntriesForPass(db: DrizzleDb, passId: string) {
  return db
    .select()
    .from(entries)
    .where(eq(entries.passId, passId))
    .orderBy(asc(entries.createdAt))
    .all()
}

export function countEntriesForPass(db: DrizzleDb, passId: string): number {
  const result = db
    .select({ count: count() })
    .from(entries)
    .where(eq(entries.passId, passId))
    .get()
  return result?.count ?? 0
}

export function updateEntry(
  db: DrizzleDb,
  entryId: string,
  data: { visitDate?: string; comment?: string | null }
) {
  db.update(entries)
    .set({
      ...(data.visitDate !== undefined && { visitDate: data.visitDate }),
      ...(data.comment !== undefined && { comment: data.comment }),
    })
    .where(eq(entries.id, entryId))
    .run()
}

export function deleteEntry(db: DrizzleDb, entryId: string) {
  db.delete(entries).where(eq(entries.id, entryId)).run()
}
