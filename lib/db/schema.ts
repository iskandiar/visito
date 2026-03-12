// lib/db/schema.ts
import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core'

export const passes = pgTable('passes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  totalEntries: integer('total_entries').notNull(),
  userLink: text('user_link').notNull().unique(),
  supervisorLink: text('supervisor_link').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
})

export const entries = pgTable('entries', {
  id: text('id').primaryKey(),
  passId: text('pass_id')
    .notNull()
    .references(() => passes.id, { onDelete: 'cascade' }),
  visitDate: text('visit_date').notNull(), // YYYY-MM-DD
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull(),
})

export type Pass = typeof passes.$inferSelect
export type Entry = typeof entries.$inferSelect
export type NewPass = typeof passes.$inferInsert
export type NewEntry = typeof entries.$inferInsert
