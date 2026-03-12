# Supabase Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace better-sqlite3 (local SQLite) with Supabase PostgreSQL so the app runs on Vercel's free tier.

**Architecture:** Swap the drizzle driver from `better-sqlite3` to `postgres` (postgres.js), update the schema from sqlite to pg types, and make all DB calls async. No structural changes to the app — same routes, same logic.

**Tech Stack:** Next.js 16, drizzle-orm, postgres (postgres.js), Supabase (PostgreSQL), Vercel

---

### Task 1: Swap dependencies

**Files:**
- Modify: `package.json`

**Step 1: Remove old deps, add new**

```bash
npm uninstall better-sqlite3 @types/better-sqlite3
npm install postgres
```

**Step 2: Verify package.json**

`better-sqlite3` and `@types/better-sqlite3` must be gone. `postgres` must appear in `dependencies`.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: swap better-sqlite3 for postgres"
```

---

### Task 2: Update schema

**Files:**
- Modify: `lib/db/schema.ts`

**Step 1: Replace the file contents**

```ts
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
```

**Step 2: Check TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in schema.ts (client.ts will still error until Task 3).

**Step 3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: migrate schema from sqlite to postgres"
```

---

### Task 3: Update DB client

**Files:**
- Modify: `lib/db/client.ts`

**Step 1: Replace the file contents**

```ts
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
```

**Step 2: Check TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: errors only in passes.ts and entries.ts (`.run()`, `.get()`, `.all()` no longer exist on async drizzle).

**Step 3: Commit**

```bash
git add lib/db/client.ts
git commit -m "feat: switch drizzle driver to postgres-js"
```

---

### Task 4: Update passes.ts to async

**Files:**
- Modify: `lib/db/passes.ts`

**Step 1: Replace the file contents**

```ts
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
```

**Step 2: Check TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: passes.ts clean; errors remain only in entries.ts and routes.

**Step 3: Commit**

```bash
git add lib/db/passes.ts
git commit -m "feat: make passes DB functions async"
```

---

### Task 5: Update entries.ts to async

**Files:**
- Modify: `lib/db/entries.ts`

**Step 1: Replace the file contents**

```ts
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
```

**Step 2: Check TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: lib/ clean; errors only in API routes.

**Step 3: Commit**

```bash
git add lib/db/entries.ts
git commit -m "feat: make entries DB functions async"
```

---

### Task 6: Update API routes

**Files:**
- Modify: `app/api/passes/route.ts`
- Modify: `app/api/passes/[userLink]/route.ts`
- Modify: `app/api/passes/[userLink]/entries/route.ts`
- Modify: `app/api/supervisor/[supervisorLink]/entries/[entryId]/route.ts`

**Step 1: Update `app/api/passes/route.ts`**

Only change: add `await` to `createPass`.

```ts
// app/api/passes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { createPass } from '@/lib/db/passes'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, totalEntries } = body

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (
    typeof totalEntries !== 'number' ||
    !Number.isInteger(totalEntries) ||
    totalEntries < 1 ||
    totalEntries > 1000
  ) {
    return NextResponse.json(
      { error: 'totalEntries must be an integer between 1 and 1000' },
      { status: 400 }
    )
  }

  const db = getDb()
  const result = await createPass(db, { name: name.trim(), totalEntries })
  return NextResponse.json(result, { status: 201 })
}
```

**Step 2: Update `app/api/passes/[userLink]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { getPassByUserLink } from '@/lib/db/passes'
import { getEntriesForPass } from '@/lib/db/entries'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userLink: string }> }
) {
  const { userLink } = await params
  const db = getDb()
  const pass = await getPassByUserLink(db, userLink)

  if (!pass) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const passEntries = await getEntriesForPass(db, pass.id)
  return NextResponse.json({ pass, entries: passEntries })
}
```

**Step 3: Update `app/api/passes/[userLink]/entries/route.ts`**

Key change: `db.transaction` becomes `await db.transaction(async (tx) => { ... })`.

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { getPassByUserLink } from '@/lib/db/passes'
import { countEntriesForPass, addEntry } from '@/lib/db/entries'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userLink: string }> }
) {
  const { userLink } = await params
  const db = getDb()
  const pass = await getPassByUserLink(db, userLink)

  if (!pass) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { visitDate, comment } = body

  if (!visitDate || !/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
    return NextResponse.json({ error: 'visitDate must be YYYY-MM-DD' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]
  if (visitDate > today) {
    return NextResponse.json({ error: 'visitDate cannot be in the future' }, { status: 400 })
  }

  const result = await db.transaction(async (tx) => {
    const entryCount = await countEntriesForPass(tx as unknown as typeof db, pass.id)
    if (entryCount >= pass.totalEntries) {
      return { full: true, id: null as string | null }
    }
    const id = await addEntry(tx as unknown as typeof db, { passId: pass.id, visitDate, comment: comment ?? undefined })
    return { full: false, id: id as string | null }
  })

  if (result.full) {
    return NextResponse.json({ error: 'Pass is full' }, { status: 409 })
  }
  return NextResponse.json({ id: result.id }, { status: 201 })
}
```

**Step 4: Update `app/api/supervisor/[supervisorLink]/entries/[entryId]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { getPassBySupervisorLink } from '@/lib/db/passes'
import { getEntry, updateEntry, deleteEntry } from '@/lib/db/entries'

type Params = { params: Promise<{ supervisorLink: string; entryId: string }> }

async function resolvePassAndEntry(supervisorLink: string, entryId: string) {
  const db = getDb()
  const pass = await getPassBySupervisorLink(db, supervisorLink)
  if (!pass) return { db, pass: null, entry: null }

  const entry = await getEntry(db, entryId)
  if (!entry || entry.passId !== pass.id) return { db, pass, entry: null }

  return { db, pass, entry }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supervisorLink, entryId } = await params
  const { db, pass, entry } = await resolvePassAndEntry(supervisorLink, entryId)

  if (!pass || !entry) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { visitDate, comment } = body

  if (visitDate !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
      return NextResponse.json({ error: 'visitDate must be YYYY-MM-DD' }, { status: 400 })
    }
    const today = new Date().toISOString().split('T')[0]
    if (visitDate > today) {
      return NextResponse.json({ error: 'visitDate cannot be in the future' }, { status: 400 })
    }
  }

  await updateEntry(db, entryId, {
    ...(visitDate !== undefined && { visitDate }),
    ...(comment !== undefined && { comment }),
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { supervisorLink, entryId } = await params
  const { db, pass, entry } = await resolvePassAndEntry(supervisorLink, entryId)

  if (!pass || !entry) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await deleteEntry(db, entryId)
  return NextResponse.json({ success: true })
}
```

**Step 5: Check TypeScript compiles clean**

```bash
npx tsc --noEmit
```

Expected: zero errors.

**Step 6: Commit**

```bash
git add app/api/
git commit -m "feat: await all DB calls in API routes"
```

---

### Task 7: Update drizzle config and add env example

**Files:**
- Modify: `drizzle.config.ts`
- Create: `.env.local.example`

**Step 1: Update drizzle.config.ts**

```ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
```

**Step 2: Create `.env.local.example`**

```
# Supabase connection string (transaction mode pooler — port 6543)
# Found in: Supabase dashboard → Settings → Database → Connection string → Transaction
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Step 3: Commit**

```bash
git add drizzle.config.ts .env.local.example
git commit -m "chore: update drizzle config for postgresql, add env example"
```

---

### Task 8: Push schema to Supabase and verify

**Pre-requisite:** You must have a Supabase project created and `DATABASE_URL` set in `.env.local`.

**Step 1: Create `.env.local` with your real DATABASE_URL**

Copy `.env.local.example` to `.env.local` and fill in the real URL from Supabase dashboard.

**Step 2: Generate migration**

```bash
npx drizzle-kit generate
```

Expected: creates `drizzle/0000_*.sql` with CREATE TABLE statements for `passes` and `entries`.

**Step 3: Push schema to Supabase**

```bash
npx drizzle-kit push
```

Expected: tables created in Supabase. No errors.

**Step 4: Run dev server**

```bash
npm run dev
```

Expected: server starts on localhost:3000 with no errors.

**Step 5: Smoke test the API**

```bash
# Create a pass
curl -X POST http://localhost:3000/api/passes \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Pass","totalEntries":5}'
# Expected: {"id":"...","userLink":"...","supervisorLink":"..."}
```

Copy the `userLink` from the response and test:

```bash
curl http://localhost:3000/api/passes/<userLink>
# Expected: {"pass":{...},"entries":[]}
```

**Step 6: Commit nothing** — this step is verification only.
