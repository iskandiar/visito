# Entry Pass App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first web app for managing limited-entry passes (gym/yoga/class visits) with shareable links and supervisor editing.

**Architecture:** Next.js 15 App Router, SQLite via Drizzle ORM + better-sqlite3, Tailwind + shadcn/ui. Query functions accept a `db` parameter for testability; route handlers use a singleton via `getDb()` and are tested by mocking that module with vi.mock. Hosted on Fly.io with a persistent volume.

**Tech Stack:** Next.js 15, TypeScript, Drizzle ORM, better-sqlite3, Tailwind CSS, shadcn/ui, Vitest

---

## Task 1: Scaffold Next.js project

> **Model:** haiku (config scaffolding)

**Files:**
- Create: `next.config.ts`
- Create: `drizzle.config.ts`

**Step 1: Create the Next.js app**

```bash
cd /Users/amaj/projects/visito-claude
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes
```

Expected: project files created (app/, public/, package.json, tsconfig.json, etc.)

**Step 2: Install additional dependencies**

```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3 vitest
```

**Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init --defaults
npx shadcn@latest add button card badge sheet dialog input label separator
```

**Step 4: Configure next.config.ts to mark better-sqlite3 as external**

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
```

**Step 5: Create drizzle.config.ts**

```ts
// drizzle.config.ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './dev.db',
  },
} satisfies Config
```

**Step 6: Verify the app starts**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 app with Drizzle + shadcn/ui"
```

---

## Task 2: Configure Vitest

> **Model:** haiku (config)

**Files:**
- Create: `vitest.config.ts`

**Step 1: Create vitest.config.ts**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

**Step 2: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 3: Create test helpers directory**

```bash
mkdir -p __tests__/db __tests__/routes __tests__/helpers
```

**Step 4: Create shared test DB helper**

```ts
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
```

**Step 5: Run vitest to verify config (no tests yet)**

```bash
npm test
```

Expected: "No test files found" or 0 tests passing — no errors

**Step 6: Commit**

```bash
git add vitest.config.ts __tests__/helpers/testDb.ts package.json
git commit -m "feat: add Vitest config and test DB helper"
```

---

## Task 3: Define Drizzle schema

> **Model:** sonnet (type-safe schema design)

**Files:**
- Create: `lib/db/schema.ts`

**Step 1: Create the schema file**

```ts
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
```

**Step 2: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: add Drizzle schema for passes and entries"
```

---

## Task 4: Set up DB client

> **Model:** sonnet (singleton + WAL config)

**Files:**
- Create: `lib/db/client.ts`

**Step 1: Create the DB client**

```ts
// lib/db/client.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

export function createDb(url: string = process.env.DATABASE_URL ?? './dev.db'): DrizzleDb {
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
```

**Step 2: Push schema to create dev.db**

```bash
npx drizzle-kit push
```

Expected: "All changes applied" — creates dev.db

**Step 3: Add dev.db to .gitignore**

Add to `.gitignore`:
```
dev.db
/data/
*.db
```

**Step 4: Commit**

```bash
git add lib/db/client.ts .gitignore
git commit -m "feat: add Drizzle DB client with WAL mode"
```

---

## Task 5: Pass query functions + tests

> **Model:** sonnet (business logic + TDD)

**Files:**
- Create: `lib/db/passes.ts`
- Create: `__tests__/db/passes.test.ts`

**Step 1: Write the failing tests first**

```ts
// __tests__/db/passes.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb, type TestDb } from '../helpers/testDb'
import { createPass, getPassByUserLink, getPassBySupervisorLink } from '@/lib/db/passes'

describe('pass queries', () => {
  let db: TestDb

  beforeEach(() => {
    db = createTestDb()
  })

  it('creates a pass and returns unique links', () => {
    const result = createPass(db, { name: 'Yoga 10', totalEntries: 10 })
    expect(result.id).toBeDefined()
    expect(result.userLink).toBeDefined()
    expect(result.supervisorLink).toBeDefined()
    expect(result.userLink).not.toBe(result.supervisorLink)
  })

  it('retrieves pass by user link', () => {
    const { userLink } = createPass(db, { name: 'Gym 8', totalEntries: 8 })
    const pass = getPassByUserLink(db, userLink)
    expect(pass?.name).toBe('Gym 8')
    expect(pass?.totalEntries).toBe(8)
  })

  it('returns undefined for unknown user link', () => {
    expect(getPassByUserLink(db, 'no-such-link')).toBeUndefined()
  })

  it('retrieves pass by supervisor link', () => {
    const { supervisorLink } = createPass(db, { name: 'Pilates 12', totalEntries: 12 })
    const pass = getPassBySupervisorLink(db, supervisorLink)
    expect(pass?.name).toBe('Pilates 12')
  })

  it('returns undefined for unknown supervisor link', () => {
    expect(getPassBySupervisorLink(db, 'no-such-link')).toBeUndefined()
  })

  it('generates unique links across multiple passes', () => {
    const a = createPass(db, { name: 'A', totalEntries: 5 })
    const b = createPass(db, { name: 'B', totalEntries: 5 })
    expect(a.userLink).not.toBe(b.userLink)
    expect(a.supervisorLink).not.toBe(b.supervisorLink)
    expect(a.id).not.toBe(b.id)
  })
})
```

**Step 2: Run tests to confirm they fail**

```bash
npm test -- __tests__/db/passes.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/db/passes'"

**Step 3: Implement pass query functions**

```ts
// lib/db/passes.ts
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
  db.insert(passes)
    .values({ id, name: data.name, totalEntries: data.totalEntries, userLink, supervisorLink, createdAt: new Date() })
    .run()
  return { id, userLink, supervisorLink }
}

export function getPassByUserLink(db: DrizzleDb, userLink: string) {
  return db.select().from(passes).where(eq(passes.userLink, userLink)).get()
}

export function getPassBySupervisorLink(db: DrizzleDb, supervisorLink: string) {
  return db.select().from(passes).where(eq(passes.supervisorLink, supervisorLink)).get()
}
```

**Step 4: Run tests to confirm they pass**

```bash
npm test -- __tests__/db/passes.test.ts
```

Expected: 6 tests PASS

**Step 5: Commit**

```bash
git add lib/db/passes.ts __tests__/db/passes.test.ts
git commit -m "feat: add pass query functions with tests"
```

---

## Task 6: Entry query functions + tests

> **Model:** sonnet (business logic + TDD)

**Files:**
- Create: `lib/db/entries.ts`
- Create: `__tests__/db/entries.test.ts`

**Step 1: Write the failing tests first**

```ts
// __tests__/db/entries.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestDb, type TestDb } from '../helpers/testDb'
import { createPass } from '@/lib/db/passes'
import {
  addEntry,
  countEntriesForPass,
  getEntriesForPass,
  getEntry,
  updateEntry,
  deleteEntry,
} from '@/lib/db/entries'

describe('entry queries', () => {
  let db: TestDb
  let passId: string

  beforeEach(() => {
    db = createTestDb()
    passId = createPass(db, { name: 'Test', totalEntries: 3 }).id
  })

  it('adds an entry and retrieves it', () => {
    const id = addEntry(db, { passId, visitDate: '2026-03-07' })
    const entry = getEntry(db, id)
    expect(entry?.visitDate).toBe('2026-03-07')
    expect(entry?.comment).toBeNull()
    expect(entry?.passId).toBe(passId)
  })

  it('adds entry with comment', () => {
    const id = addEntry(db, { passId, visitDate: '2026-03-07', comment: 'Great session' })
    expect(getEntry(db, id)?.comment).toBe('Great session')
  })

  it('counts entries correctly', () => {
    expect(countEntriesForPass(db, passId)).toBe(0)
    addEntry(db, { passId, visitDate: '2026-03-07' })
    addEntry(db, { passId, visitDate: '2026-03-07' })
    expect(countEntriesForPass(db, passId)).toBe(2)
  })

  it('allows multiple entries on the same day', () => {
    addEntry(db, { passId, visitDate: '2026-03-07' })
    addEntry(db, { passId, visitDate: '2026-03-07' })
    expect(countEntriesForPass(db, passId)).toBe(2)
  })

  it('retrieves all entries for a pass ordered by createdAt', () => {
    addEntry(db, { passId, visitDate: '2026-03-01' })
    addEntry(db, { passId, visitDate: '2026-03-05' })
    const all = getEntriesForPass(db, passId)
    expect(all).toHaveLength(2)
  })

  it('updates entry date and comment', () => {
    const id = addEntry(db, { passId, visitDate: '2026-03-01', comment: 'old' })
    updateEntry(db, id, { visitDate: '2026-03-02', comment: 'new' })
    const entry = getEntry(db, id)
    expect(entry?.visitDate).toBe('2026-03-02')
    expect(entry?.comment).toBe('new')
  })

  it('clears comment when set to null', () => {
    const id = addEntry(db, { passId, visitDate: '2026-03-01', comment: 'remove me' })
    updateEntry(db, id, { comment: null })
    expect(getEntry(db, id)?.comment).toBeNull()
  })

  it('deletes an entry', () => {
    const id = addEntry(db, { passId, visitDate: '2026-03-07' })
    deleteEntry(db, id)
    expect(getEntry(db, id)).toBeUndefined()
    expect(countEntriesForPass(db, passId)).toBe(0)
  })

  it('returns undefined for unknown entry', () => {
    expect(getEntry(db, 'no-such-id')).toBeUndefined()
  })
})
```

**Step 2: Run tests to confirm they fail**

```bash
npm test -- __tests__/db/entries.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/db/entries'"

**Step 3: Implement entry query functions**

```ts
// lib/db/entries.ts
import { eq, count, asc } from 'drizzle-orm'
import type { DrizzleDb } from './client'
import { entries } from './schema'

export function addEntry(
  db: DrizzleDb,
  data: { passId: string; visitDate: string; comment?: string }
) {
  const id = crypto.randomUUID()
  db.insert(entries)
    .values({
      id,
      passId: data.passId,
      visitDate: data.visitDate,
      comment: data.comment ?? null,
      createdAt: new Date(),
    })
    .run()
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
```

**Step 4: Run all tests**

```bash
npm test
```

Expected: all tests PASS

**Step 5: Commit**

```bash
git add lib/db/entries.ts __tests__/db/entries.test.ts
git commit -m "feat: add entry query functions with tests"
```

---

## Task 7: POST /api/passes route + tests

> **Model:** sonnet (validation logic, route handler tests with vi.mock)

**Files:**
- Create: `app/api/passes/route.ts`
- Create: `__tests__/routes/passes.test.ts`

**Step 1: Write the failing route tests**

```ts
// __tests__/routes/passes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestDb, type TestDb } from '../helpers/testDb'

let db: TestDb

vi.mock('@/lib/db/client', () => ({
  getDb: () => db,
}))

const { POST } = await import('@/app/api/passes/route')

describe('POST /api/passes', () => {
  beforeEach(() => {
    db = createTestDb()
  })

  it('creates a pass and returns user and supervisor links', async () => {
    const req = new Request('http://localhost/api/passes', {
      method: 'POST',
      body: JSON.stringify({ name: 'Yoga 10', totalEntries: 10 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.userLink).toBeDefined()
    expect(body.supervisorLink).toBeDefined()
    expect(body.id).toBeDefined()
  })

  it('returns 400 when name is missing', async () => {
    const req = new Request('http://localhost/api/passes', {
      method: 'POST',
      body: JSON.stringify({ totalEntries: 10 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when totalEntries is zero', async () => {
    const req = new Request('http://localhost/api/passes', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', totalEntries: 0 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when totalEntries is not a number', async () => {
    const req = new Request('http://localhost/api/passes', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', totalEntries: 'ten' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })
})
```

**Step 2: Run tests to confirm they fail**

```bash
npm test -- __tests__/routes/passes.test.ts
```

Expected: FAIL — "Cannot find module '@/app/api/passes/route'"

**Step 3: Implement the route handler**

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
  const result = createPass(db, { name: name.trim(), totalEntries })
  return NextResponse.json(result, { status: 201 })
}
```

**Step 4: Run tests**

```bash
npm test -- __tests__/routes/passes.test.ts
```

Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add app/api/passes/route.ts __tests__/routes/passes.test.ts
git commit -m "feat: add POST /api/passes route with tests"
```

---

## Task 8: GET /api/passes/[userLink] route

> **Model:** haiku (thin route, no complex logic)

**Files:**
- Create: `app/api/passes/[userLink]/route.ts`

**Step 1: Implement the route handler**

```ts
// app/api/passes/[userLink]/route.ts
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
  const pass = getPassByUserLink(db, userLink)

  if (!pass) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const passEntries = getEntriesForPass(db, pass.id)
  return NextResponse.json({ pass, entries: passEntries })
}
```

**Step 2: Commit**

```bash
git add app/api/passes/[userLink]/route.ts
git commit -m "feat: add GET /api/passes/[userLink] route"
```

---

## Task 9: POST /api/passes/[userLink]/entries route + tests

> **Model:** sonnet (entry validation, full/future-date logic)

**Files:**
- Create: `app/api/passes/[userLink]/entries/route.ts`
- Create: `__tests__/routes/entries.test.ts`

**Step 1: Write the failing tests**

```ts
// __tests__/routes/entries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestDb, type TestDb } from '../helpers/testDb'
import { createPass } from '@/lib/db/passes'

let db: TestDb

vi.mock('@/lib/db/client', () => ({
  getDb: () => db,
}))

const { POST } = await import('@/app/api/passes/[userLink]/entries/route')

function makeReq(userLink: string, body: object) {
  return new Request(`http://localhost/api/passes/${userLink}/entries`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/passes/[userLink]/entries', () => {
  let userLink: string

  beforeEach(() => {
    db = createTestDb()
    const pass = createPass(db, { name: 'Test Pass', totalEntries: 2 })
    userLink = pass.userLink
  })

  it('adds an entry and returns 201', async () => {
    const res = await POST(makeReq(userLink, { visitDate: '2026-03-07' }) as any, {
      params: Promise.resolve({ userLink }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBeDefined()
  })

  it('returns 404 for unknown user link', async () => {
    const res = await POST(makeReq('no-such-link', { visitDate: '2026-03-07' }) as any, {
      params: Promise.resolve({ userLink: 'no-such-link' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 for missing visitDate', async () => {
    const res = await POST(makeReq(userLink, {}) as any, {
      params: Promise.resolve({ userLink }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for future visitDate', async () => {
    const res = await POST(makeReq(userLink, { visitDate: '2099-01-01' }) as any, {
      params: Promise.resolve({ userLink }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 409 when pass is full', async () => {
    // Fill the pass (totalEntries: 2)
    await POST(makeReq(userLink, { visitDate: '2026-03-01' }) as any, {
      params: Promise.resolve({ userLink }),
    })
    await POST(makeReq(userLink, { visitDate: '2026-03-02' }) as any, {
      params: Promise.resolve({ userLink }),
    })
    const res = await POST(makeReq(userLink, { visitDate: '2026-03-03' }) as any, {
      params: Promise.resolve({ userLink }),
    })
    expect(res.status).toBe(409)
  })
})
```

**Step 2: Run tests to confirm they fail**

```bash
npm test -- __tests__/routes/entries.test.ts
```

Expected: FAIL — cannot find module

**Step 3: Implement the route handler**

```ts
// app/api/passes/[userLink]/entries/route.ts
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
  const pass = getPassByUserLink(db, userLink)

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

  const entryCount = countEntriesForPass(db, pass.id)
  if (entryCount >= pass.totalEntries) {
    return NextResponse.json({ error: 'Pass is full' }, { status: 409 })
  }

  const id = addEntry(db, { passId: pass.id, visitDate, comment: comment ?? undefined })
  return NextResponse.json({ id }, { status: 201 })
}
```

**Step 4: Run all tests**

```bash
npm test
```

Expected: all tests PASS

**Step 5: Commit**

```bash
git add app/api/passes/[userLink]/entries/route.ts __tests__/routes/entries.test.ts
git commit -m "feat: add POST entries route with full/future-date validation and tests"
```

---

## Task 10: Supervisor routes + tests

> **Model:** sonnet (authorization via supervisor link, PATCH + DELETE)

**Files:**
- Create: `app/api/supervisor/[supervisorLink]/entries/[entryId]/route.ts`
- Create: `__tests__/routes/supervisor.test.ts`

**Step 1: Write the failing tests**

```ts
// __tests__/routes/supervisor.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestDb, type TestDb } from '../helpers/testDb'
import { createPass } from '@/lib/db/passes'
import { addEntry, getEntry } from '@/lib/db/entries'

let db: TestDb

vi.mock('@/lib/db/client', () => ({
  getDb: () => db,
}))

const { PATCH, DELETE } = await import(
  '@/app/api/supervisor/[supervisorLink]/entries/[entryId]/route'
)

describe('supervisor entry routes', () => {
  let supervisorLink: string
  let entryId: string

  beforeEach(() => {
    db = createTestDb()
    const pass = createPass(db, { name: 'Test', totalEntries: 5 })
    supervisorLink = pass.supervisorLink
    entryId = addEntry(db, { passId: pass.id, visitDate: '2026-03-01', comment: 'original' })
  })

  function makeParams(sl: string, eid: string) {
    return { params: Promise.resolve({ supervisorLink: sl, entryId: eid }) }
  }

  // PATCH tests
  it('PATCH updates entry date', async () => {
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ visitDate: '2026-03-05' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any, makeParams(supervisorLink, entryId))
    expect(res.status).toBe(200)
    expect(getEntry(db, entryId)?.visitDate).toBe('2026-03-05')
  })

  it('PATCH returns 404 for wrong supervisor link', async () => {
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ visitDate: '2026-03-05' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any, makeParams('wrong-link', entryId))
    expect(res.status).toBe(404)
  })

  it('PATCH returns 400 for future date', async () => {
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ visitDate: '2099-12-31' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any, makeParams(supervisorLink, entryId))
    expect(res.status).toBe(400)
  })

  it('PATCH returns 404 for entry not belonging to pass', async () => {
    const otherPass = createPass(db, { name: 'Other', totalEntries: 5 })
    const otherId = addEntry(db, { passId: otherPass.id, visitDate: '2026-03-01' })
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ visitDate: '2026-03-05' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req as any, makeParams(supervisorLink, otherId))
    expect(res.status).toBe(404)
  })

  // DELETE tests
  it('DELETE removes the entry', async () => {
    const req = new Request('http://localhost', { method: 'DELETE' })
    const res = await DELETE(req as any, makeParams(supervisorLink, entryId))
    expect(res.status).toBe(200)
    expect(getEntry(db, entryId)).toBeUndefined()
  })

  it('DELETE returns 404 for wrong supervisor link', async () => {
    const req = new Request('http://localhost', { method: 'DELETE' })
    const res = await DELETE(req as any, makeParams('wrong-link', entryId))
    expect(res.status).toBe(404)
  })
})
```

**Step 2: Run tests to confirm they fail**

```bash
npm test -- __tests__/routes/supervisor.test.ts
```

Expected: FAIL — cannot find module

**Step 3: Implement the supervisor route**

```ts
// app/api/supervisor/[supervisorLink]/entries/[entryId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { getPassBySupervisorLink } from '@/lib/db/passes'
import { getEntry, updateEntry, deleteEntry } from '@/lib/db/entries'

type Params = { params: Promise<{ supervisorLink: string; entryId: string }> }

async function resolvePassAndEntry(supervisorLink: string, entryId: string) {
  const db = getDb()
  const pass = getPassBySupervisorLink(db, supervisorLink)
  if (!pass) return { db, pass: null, entry: null }

  const entry = getEntry(db, entryId)
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

  updateEntry(db, entryId, {
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

  deleteEntry(db, entryId)
  return NextResponse.json({ success: true })
}
```

**Step 4: Run all tests**

```bash
npm test
```

Expected: all tests PASS

**Step 5: Commit**

```bash
git add app/api/supervisor/ __tests__/routes/supervisor.test.ts
git commit -m "feat: add supervisor PATCH/DELETE routes with tests"
```

---

## Task 11: Landing page

> **Model:** sonnet (UI + form + mobile-first design)

**Files:**
- Create: `app/page.tsx`
- Create: `components/create-pass-form.tsx`

**Step 1: Create the client-side create pass form**

```tsx
// components/create-pass-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const PRESET_COUNTS = [8, 10, 12, 24]

export function CreatePassForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [totalEntries, setTotalEntries] = useState<number>(10)
  const [customEntries, setCustomEntries] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    userLink: string
    supervisorLink: string
  } | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const entries = useCustom ? parseInt(customEntries) : totalEntries
    if (!name.trim()) return setError('Pass name is required')
    if (!entries || entries < 1 || entries > 1000)
      return setError('Entry count must be between 1 and 1000')

    setLoading(true)
    try {
      const res = await fetch('/api/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), totalEntries: entries }),
      })
      if (!res.ok) throw new Error('Failed to create pass')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  if (result) {
    const userUrl = `${window.location.origin}/p/${result.userLink}`
    const supervisorUrl = `${window.location.origin}/s/${result.supervisorLink}`
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Pass created!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium">User link (share this)</Label>
            <div className="flex gap-2">
              <Input value={userUrl} readOnly className="text-sm" />
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(userUrl)}>
                Copy
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium text-amber-600">
              Supervisor link (keep private)
            </Label>
            <div className="flex gap-2">
              <Input value={supervisorUrl} readOnly className="text-sm" />
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(supervisorUrl)}>
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Save this link — it lets you edit or delete entries. Do not share publicly.
            </p>
          </div>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              setResult(null)
              setName('')
            }}
          >
            Create another pass
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create a new pass</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Pass name</Label>
            <Input
              id="name"
              placeholder="e.g. Anna – Yoga 10-pack"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Number of entries</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COUNTS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={!useCustom && totalEntries === n ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTotalEntries(n)
                    setUseCustom(false)
                  }}
                >
                  {n}
                </Button>
              ))}
              <Button
                type="button"
                variant={useCustom ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseCustom(true)}
              >
                Custom
              </Button>
            </div>
            {useCustom && (
              <Input
                type="number"
                min={1}
                max={1000}
                placeholder="Enter number"
                value={customEntries}
                onChange={(e) => setCustomEntries(e.target.value)}
              />
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating…' : 'Create pass'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Create the landing page**

```tsx
// app/page.tsx
import { CreatePassForm } from '@/components/create-pass-form'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12 flex flex-col items-center gap-12">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Entry Pass</h1>
          <p className="text-lg text-muted-foreground max-w-sm">
            Create passes for gym visits, yoga classes, or any activity with a limited number
            of entries. Share the link — anyone can record a visit.
          </p>
        </div>

        {/* How it works */}
        <div className="w-full max-w-md space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            How it works
          </h2>
          <ol className="space-y-2 text-sm">
            {[
              'Create a pass with a name and number of entries',
              'Share the user link with the pass holder',
              'They tap the link to record each visit',
              'Once all entries are used, the pass closes',
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Form */}
        <CreatePassForm />
      </div>
    </main>
  )
}
```

**Step 3: Verify visually in browser**

```bash
npm run dev
```

Open http://localhost:3000 — verify landing page renders, form creates a pass and shows both links.

**Step 4: Commit**

```bash
git add app/page.tsx components/create-pass-form.tsx
git commit -m "feat: add landing page with create pass form"
```

---

## Task 12: Pass view page

> **Model:** sonnet (entry grid, add-entry sheet, mobile-first UX)

**Files:**
- Create: `app/p/[userLink]/page.tsx`
- Create: `components/add-entry-sheet.tsx`
- Create: `components/entry-grid.tsx`

**Step 1: Create the entry grid component**

```tsx
// components/entry-grid.tsx
import type { Entry } from '@/lib/db/schema'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface EntryGridProps {
  entries: Entry[]
  totalEntries: number
  supervisorMode?: boolean
  onEdit?: (entry: Entry) => void
  onDelete?: (entryId: string) => void
}

export function EntryGrid({
  entries,
  totalEntries,
  supervisorMode = false,
  onEdit,
  onDelete,
}: EntryGridProps) {
  const slots = Array.from({ length: totalEntries }, (_, i) => ({
    number: i + 1,
    entry: entries[i] ?? null,
  }))

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {slots.map(({ number, entry }) => (
        <div
          key={number}
          className={cn(
            'rounded-xl border p-3 min-h-[80px] flex flex-col gap-1',
            entry ? 'bg-card border-border' : 'bg-muted/30 border-dashed border-muted-foreground/30'
          )}
        >
          <span
            className={cn(
              'text-xs font-semibold',
              entry ? 'text-muted-foreground' : 'text-muted-foreground/50'
            )}
          >
            #{number}
          </span>
          {entry ? (
            <>
              <span className="text-sm font-medium">{entry.visitDate}</span>
              {entry.comment && (
                <span className="text-xs text-muted-foreground truncate">{entry.comment}</span>
              )}
              {supervisorMode && (
                <div className="flex gap-1 mt-auto">
                  <button
                    onClick={() => onEdit?.(entry)}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Edit
                  </button>
                  <span className="text-xs text-muted-foreground">·</span>
                  <button
                    onClick={() => onDelete?.(entry.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </div>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground/40 mt-auto">Available</span>
          )}
        </div>
      ))}
    </div>
  )
}
```

**Step 2: Create the add-entry sheet**

```tsx
// components/add-entry-sheet.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AddEntrySheetProps {
  userLink: string
  isFull: boolean
}

export function AddEntrySheet({ userLink, isFull }: AddEntrySheetProps) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [visitDate, setVisitDate] = useState(today)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/passes/${userLink}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitDate, comment: comment || undefined }),
      })
      if (res.status === 409) return setError('Pass is full')
      if (!res.ok) {
        const body = await res.json()
        return setError(body.error ?? 'Failed to record visit')
      }
      setOpen(false)
      setComment('')
      setVisitDate(today)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (isFull) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
        This pass is full. A new pass must be issued for further visits.
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="lg" className="w-full text-base h-14">
          Record a visit
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle>Record a visit</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="visit-date">Visit date</Label>
            <Input
              id="visit-date"
              type="date"
              max={today}
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Input
              id="comment"
              placeholder="e.g. Morning session"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
            {loading ? 'Saving…' : 'Save visit'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
```

**Step 3: Create the pass view page (Server Component)**

```tsx
// app/p/[userLink]/page.tsx
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db/client'
import { getPassByUserLink } from '@/lib/db/passes'
import { getEntriesForPass, countEntriesForPass } from '@/lib/db/entries'
import { EntryGrid } from '@/components/entry-grid'
import { AddEntrySheet } from '@/components/add-entry-sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default async function PassPage({
  params,
}: {
  params: Promise<{ userLink: string }>
}) {
  const { userLink } = await params
  const db = getDb()
  const pass = getPassByUserLink(db, userLink)
  if (!pass) notFound()

  const entries = getEntriesForPass(db, pass.id)
  const used = entries.length
  const isFull = used >= pass.totalEntries

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{pass.name}</h1>
          <p className="text-sm text-muted-foreground">
            Issued {pass.createdAt.toLocaleDateString()}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <Badge variant={isFull ? 'destructive' : 'secondary'} className="text-sm px-3 py-1">
            {used} / {pass.totalEntries} used
          </Badge>
          {isFull && (
            <span className="text-sm font-medium text-destructive">Pass full</span>
          )}
        </div>

        <Separator />

        {/* Entry grid */}
        <EntryGrid entries={entries} totalEntries={pass.totalEntries} />

        {/* Add entry */}
        <AddEntrySheet userLink={userLink} isFull={isFull} />
      </div>
    </main>
  )
}
```

**Step 4: Verify in browser**

Create a pass on the landing page, open the user link. Verify:
- Pass name, date, entries count display correctly
- Entry grid shows correct number of slots
- "Record a visit" button opens a bottom sheet
- Submitting adds an entry and refreshes the page

**Step 5: Commit**

```bash
git add app/p/ components/add-entry-sheet.tsx components/entry-grid.tsx
git commit -m "feat: add pass view page with entry grid and add-entry sheet"
```

---

## Task 13: Supervisor view page

> **Model:** sonnet (edit/delete actions, dialog, mobile UX)

**Files:**
- Create: `app/s/[supervisorLink]/page.tsx`
- Create: `components/supervisor-entry-grid.tsx`

**Step 1: Create the supervisor entry grid (client component with edit/delete)**

```tsx
// components/supervisor-entry-grid.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Entry } from '@/lib/db/schema'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SupervisorEntryGridProps {
  entries: Entry[]
  totalEntries: number
  supervisorLink: string
}

export function SupervisorEntryGrid({
  entries,
  totalEntries,
  supervisorLink,
}: SupervisorEntryGridProps) {
  const router = useRouter()
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editComment, setEditComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const slots = Array.from({ length: totalEntries }, (_, i) => ({
    number: i + 1,
    entry: entries[i] ?? null,
  }))

  async function handleDelete(entryId: string) {
    if (!confirm('Delete this entry?')) return
    await fetch(`/api/supervisor/${supervisorLink}/entries/${entryId}`, {
      method: 'DELETE',
    })
    router.refresh()
  }

  function openEdit(entry: Entry) {
    setEditingEntry(entry)
    setEditDate(entry.visitDate)
    setEditComment(entry.comment ?? '')
    setError('')
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingEntry) return
    setError('')
    setSaving(true)
    try {
      const res = await fetch(
        `/api/supervisor/${supervisorLink}/entries/${editingEntry.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitDate: editDate,
            comment: editComment || null,
          }),
        }
      )
      if (!res.ok) {
        const body = await res.json()
        return setError(body.error ?? 'Failed to save')
      }
      setEditingEntry(null)
      router.refresh()
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map(({ number, entry }) => (
          <div
            key={number}
            className={cn(
              'rounded-xl border p-3 min-h-[80px] flex flex-col gap-1',
              entry
                ? 'bg-card border-border'
                : 'bg-muted/30 border-dashed border-muted-foreground/30'
            )}
          >
            <span
              className={cn(
                'text-xs font-semibold',
                entry ? 'text-muted-foreground' : 'text-muted-foreground/50'
              )}
            >
              #{number}
            </span>
            {entry ? (
              <>
                <span className="text-sm font-medium">{entry.visitDate}</span>
                {entry.comment && (
                  <span className="text-xs text-muted-foreground truncate">{entry.comment}</span>
                )}
                <div className="flex gap-1 mt-auto pt-1">
                  <button
                    onClick={() => openEdit(entry)}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Edit
                  </button>
                  <span className="text-xs text-muted-foreground">·</span>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <span className="text-xs text-muted-foreground/40 mt-auto">Available</span>
            )}
          </div>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-1">
              <Label>Visit date</Label>
              <Input
                type="date"
                max={today}
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Comment (optional)</Label>
              <Input
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Optional note"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingEntry(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

**Step 2: Create the supervisor page (Server Component)**

```tsx
// app/s/[supervisorLink]/page.tsx
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db/client'
import { getPassBySupervisorLink } from '@/lib/db/passes'
import { getEntriesForPass } from '@/lib/db/entries'
import { SupervisorEntryGrid } from '@/components/supervisor-entry-grid'
import { AddEntrySheet } from '@/components/add-entry-sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default async function SupervisorPage({
  params,
}: {
  params: Promise<{ supervisorLink: string }>
}) {
  const { supervisorLink } = await params
  const db = getDb()
  const pass = getPassBySupervisorLink(db, supervisorLink)
  if (!pass) notFound()

  const entries = getEntriesForPass(db, pass.id)
  const used = entries.length
  const isFull = used >= pass.totalEntries

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{pass.name}</h1>
            <Badge variant="outline" className="text-xs">Supervisor</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Issued {pass.createdAt.toLocaleDateString()}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <Badge variant={isFull ? 'destructive' : 'secondary'} className="text-sm px-3 py-1">
            {used} / {pass.totalEntries} used
          </Badge>
        </div>

        <Separator />

        {/* Supervisor entry grid with edit/delete */}
        <SupervisorEntryGrid
          entries={entries}
          totalEntries={pass.totalEntries}
          supervisorLink={supervisorLink}
        />

        {/* Add entry */}
        <AddEntrySheet userLink={pass.userLink} isFull={isFull} />
      </div>
    </main>
  )
}
```

**Step 3: Verify in browser**

Open the supervisor link. Verify:
- "Supervisor" badge is visible
- Each used entry shows Edit and Delete links
- Edit opens a dialog pre-filled with current values
- Delete removes the entry after confirmation
- Can still add entries via "Record a visit"

**Step 4: Commit**

```bash
git add app/s/ components/supervisor-entry-grid.tsx
git commit -m "feat: add supervisor view page with edit and delete entry actions"
```

---

## Task 14: Fly.io deployment config

> **Model:** haiku (config files)

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `fly.toml`
- Create: `scripts/migrate.ts`

**Step 1: Create Dockerfile**

```dockerfile
# Dockerfile
FROM node:22-alpine AS base

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS builder
COPY . .
RUN npm ci
RUN npm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache python3 make g++

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Rebuild native module in the runner stage
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
RUN cd node_modules/better-sqlite3 && npm rebuild

RUN mkdir -p /data

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Step 2: Create .dockerignore**

```
# .dockerignore
.git
node_modules
.next
dev.db
*.db
.env*
```

**Step 3: Add output: standalone to next.config.ts**

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  output: 'standalone',
}

export default nextConfig
```

**Step 4: Create fly.toml**

```toml
# fly.toml
app = "entry-pass"
primary_region = "ams"

[build]

[env]
  NODE_ENV = "production"

[mounts]
  source = "entry_pass_data"
  destination = "/data"
  initial_size = "1gb"

[[services]]
  protocol = "tcp"
  internal_port = 3000
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [services.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20
```

**Step 5: Add DATABASE_URL note to README (done in Task 15)**

When deploying: set `DATABASE_URL=file:/data/app.db` as a Fly.io secret:
```bash
fly secrets set DATABASE_URL=file:/data/app.db
```

**Step 6: Commit**

```bash
git add Dockerfile .dockerignore fly.toml next.config.ts
git commit -m "feat: add Fly.io deployment config with persistent SQLite volume"
```

---

## Task 15: README

> **Model:** haiku (documentation)

**Files:**
- Create: `README.md`

**Step 1: Write README.md**

```markdown
# Entry Pass

A lightweight web app for managing passes with a limited number of entries — gym visits, yoga classes, or any activity with a fixed count.

## Features

- Create passes with a custom entry count (8, 10, 12, 24, or any number)
- Each pass gets a shareable **user link** and a private **supervisor link**
- Record visits with an optional date adjustment and comment
- Supervisor link allows editing or deleting entries
- Mobile-first, fast, no login required

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **SQLite** via Drizzle ORM + better-sqlite3
- **Tailwind CSS** + shadcn/ui
- **Vitest** for tests

## Development

```bash
# Install dependencies
npm install

# Push schema to dev.db
npx drizzle-kit push

# Start dev server
npm run dev

# Run tests
npm test
```

## Deployment (Fly.io)

```bash
# Create the app
fly launch --no-deploy

# Create a persistent volume
fly volumes create entry_pass_data --size 1

# Set database URL
fly secrets set DATABASE_URL=file:/data/app.db

# Deploy
fly deploy
```

## Project Structure

```
app/
  api/
    passes/           # POST create pass, GET by user link
    supervisor/       # PATCH/DELETE entry via supervisor link
  p/[userLink]/       # Pass view page
  s/[supervisorLink]/ # Supervisor view page
  page.tsx            # Landing page
lib/db/
  schema.ts           # Drizzle schema
  client.ts           # DB singleton
  passes.ts           # Pass query functions
  entries.ts          # Entry query functions
components/           # Shared UI components
__tests__/            # Vitest tests
```
```

**Step 2: Run full test suite one final time**

```bash
npm test
```

Expected: all tests PASS

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with development and deployment guide"
```

---

## Summary

| Task | Model | Coverage |
|------|-------|----------|
| 1 Scaffold | haiku | project setup |
| 2 Vitest config | haiku | test infrastructure |
| 3 Schema | sonnet | data model |
| 4 DB client | sonnet | singleton + WAL |
| 5 Pass queries | sonnet | create, getByUserLink, getBySupLink |
| 6 Entry queries | sonnet | add, count, get, update, delete |
| 7 POST /api/passes | sonnet | create pass route + tests |
| 8 GET /api/passes/[userLink] | haiku | fetch pass + entries |
| 9 POST entries | sonnet | add entry, full/future validation + tests |
| 10 Supervisor routes | sonnet | PATCH/DELETE + authorization tests |
| 11 Landing page | sonnet | hero, how-it-works, create form |
| 12 Pass view | sonnet | entry grid, add-entry sheet |
| 13 Supervisor view | sonnet | edit/delete dialog |
| 14 Fly.io config | haiku | Dockerfile, fly.toml |
| 15 README | haiku | docs |
