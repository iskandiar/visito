// lib/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const passes = sqliteTable('passes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  totalEntries: integer('total_entries').notNull(),
  userLink: text('user_link').notNull().unique(),
  supervisorLink: text('supervisor_link').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(),
  passId: text('pass_id')
    .notNull()
    .references(() => passes.id, { onDelete: 'cascade' }),
  visitDate: text('visit_date').notNull(), // YYYY-MM-DD
  comment: text('comment'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export type Pass = typeof passes.$inferSelect
export type Entry = typeof entries.$inferSelect
export type NewPass = typeof passes.$inferInsert
export type NewEntry = typeof entries.$inferInsert
