# Docker + SQLite Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Revert the database layer from PostgreSQL back to SQLite, fix the Dockerfile, and add docker-compose.yml for self-hosted TrueNAS deployment.

**Architecture:** Single Next.js container with `better-sqlite3` SQLite driver via drizzle-orm. Database file persisted in a Docker named volume at `/data/db.sqlite`. Migrations run automatically on startup via `drizzle-kit push`.

**Tech Stack:** Next.js 16, better-sqlite3, drizzle-orm/better-sqlite3, Docker, docker-compose

---

### Task 1: Revert package.json dependencies

**Files:**
- Modify: `package.json`

**Step 1: Run existing tests to see current state**

```bash
npm test
```
Expected: Tests FAIL (DB functions are async, tests expect sync API)

**Step 2: Update package.json**

Replace `"postgres": "^3.4.8"` with `"better-sqlite3": "^11.0.0"` in `dependencies`.
Add `"@types/better-sqlite3": "^7.6.13"` to `devDependencies`.

Final `dependencies` block:
```json
"dependencies": {
  "@base-ui/react": "^1.2.0",
  "better-sqlite3": "^11.0.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "drizzle-orm": "^0.45.1",
  "lucide-react": "^0.577.0",
  "next": "16.1.6",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "tailwind-merge": "^3.5.0",
  "tw-animate-css": "^1.4.0"
}
```

Final `devDependencies` block (add after existing entries):
```json
"@types/better-sqlite3": "^7.6.13",
```

**Step 3: Install dependencies**

```bash
npm install
```
Expected: `node_modules` updated, `package-lock.json` updated

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: swap postgres for better-sqlite3"
```

---

### Task 2: Revert schema to SQLite

**Files:**
- Modify: `lib/db/schema.ts`

**Step 1: Rewrite schema.ts**

```typescript
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

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: Errors about `DrizzleDb` type mismatch (client.ts still uses postgres) — that's expected, fix in next task

**Step 3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: revert schema to SQLite"
```

---

### Task 3: Revert DB client to better-sqlite3

**Files:**
- Modify: `lib/db/client.ts`

**Step 1: Rewrite client.ts**

```typescript
// lib/db/client.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

export function createDb(path: string = process.env.DATABASE_PATH ?? '/data/db.sqlite'): DrizzleDb {
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

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: Errors about async functions in passes.ts/entries.ts — that's expected, fix in next tasks

**Step 3: Commit**

```bash
git add lib/db/client.ts
git commit -m "feat: revert DB client to better-sqlite3"
```

---

### Task 4: Make passes.ts synchronous

**Files:**
- Modify: `lib/db/passes.ts`

**Step 1: Rewrite passes.ts**

```typescript
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
  db.insert(passes).values({
    id,
    name: data.name,
    totalEntries: data.totalEntries,
    userLink,
    supervisorLink,
    createdAt: new Date(),
  }).run()
  return { id, userLink, supervisorLink }
}

export function getPassByUserLink(db: DrizzleDb, userLink: string) {
  return db.select().from(passes).where(eq(passes.userLink, userLink)).get()
}

export function getPassBySupervisorLink(db: DrizzleDb, supervisorLink: string) {
  return db.select().from(passes).where(eq(passes.supervisorLink, supervisorLink)).get()
}
```

**Step 2: Run db unit tests**

```bash
npm test -- __tests__/db/passes.test.ts
```
Expected: PASS (tests already use sync API)

**Step 3: Commit**

```bash
git add lib/db/passes.ts
git commit -m "feat: make passes DB functions synchronous"
```

---

### Task 5: Make entries.ts synchronous

**Files:**
- Modify: `lib/db/entries.ts`

**Step 1: Rewrite entries.ts**

```typescript
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
```

**Step 2: Run db unit tests**

```bash
npm test -- __tests__/db/
```
Expected: All PASS

**Step 3: Commit**

```bash
git add lib/db/entries.ts
git commit -m "feat: make entries DB functions synchronous"
```

---

### Task 6: Update API routes to remove await from DB calls

**Files:**
- Modify: `app/api/passes/route.ts`
- Modify: `app/api/passes/[userLink]/route.ts`
- Modify: `app/api/passes/[userLink]/entries/route.ts`
- Modify: `app/api/supervisor/[supervisorLink]/entries/[entryId]/route.ts`

**Step 1: Update `app/api/passes/route.ts`**

```typescript
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

**Step 2: Update `app/api/passes/[userLink]/route.ts`**

```typescript
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

**Step 3: Update `app/api/passes/[userLink]/entries/route.ts`**

Note: SQLite drizzle transaction is synchronous — callback is `(tx) => { ... }` not `async (tx) => { ... }`.

```typescript
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

  const result = db.transaction((tx) => {
    const entryCount = countEntriesForPass(tx as unknown as typeof db, pass.id)
    if (entryCount >= pass.totalEntries) {
      return { full: true, id: null as string | null }
    }
    const id = addEntry(tx as unknown as typeof db, { passId: pass.id, visitDate, comment: comment ?? undefined })
    return { full: false, id: id as string | null }
  })

  if (result.full) {
    return NextResponse.json({ error: 'Pass is full' }, { status: 409 })
  }
  return NextResponse.json({ id: result.id }, { status: 201 })
}
```

**Step 4: Update `app/api/supervisor/[supervisorLink]/entries/[entryId]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { getPassBySupervisorLink } from '@/lib/db/passes'
import { getEntry, updateEntry, deleteEntry } from '@/lib/db/entries'

type Params = { params: Promise<{ supervisorLink: string; entryId: string }> }

function resolvePassAndEntry(supervisorLink: string, entryId: string) {
  const db = getDb()
  const pass = getPassBySupervisorLink(db, supervisorLink)
  if (!pass) return { db, pass: null, entry: null }

  const entry = getEntry(db, entryId)
  if (!entry || entry.passId !== pass.id) return { db, pass, entry: null }

  return { db, pass, entry }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { supervisorLink, entryId } = await params
  const { db, pass, entry } = resolvePassAndEntry(supervisorLink, entryId)

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
  const { db, pass, entry } = resolvePassAndEntry(supervisorLink, entryId)

  if (!pass || !entry) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  deleteEntry(db, entryId)
  return NextResponse.json({ success: true })
}
```

**Step 5: Run all tests**

```bash
npm test
```
Expected: All PASS

**Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: No errors

**Step 7: Commit**

```bash
git add app/api/passes/route.ts \
        "app/api/passes/[userLink]/route.ts" \
        "app/api/passes/[userLink]/entries/route.ts" \
        "app/api/supervisor/[supervisorLink]/entries/[entryId]/route.ts"
git commit -m "feat: remove await from DB calls in API routes (SQLite is sync)"
```

---

### Task 7: Update drizzle.config.ts

**Files:**
- Modify: `drizzle.config.ts`

**Step 1: Rewrite drizzle.config.ts**

```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? '/data/db.sqlite',
  },
} satisfies Config
```

**Step 2: Commit**

```bash
git add drizzle.config.ts
git commit -m "chore: update drizzle config for SQLite dialect"
```

---

### Task 8: Fix Dockerfile

The existing Dockerfile references `better-sqlite3` correctly but has stale structure. Replace it entirely.

**Files:**
- Modify: `Dockerfile`

**Step 1: Rewrite Dockerfile**

```dockerfile
FROM node:22-alpine AS base
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache python3 make g++
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
RUN cd node_modules/better-sqlite3 && npm rebuild

RUN mkdir -p /data

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Step 2: Verify next.config.ts has standalone output and serverExternalPackages**

Check `next.config.ts` — it should already have:
```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  output: 'standalone',
}
```
If not, add both lines.

**Step 3: Commit**

```bash
git add Dockerfile next.config.ts
git commit -m "fix: update Dockerfile for SQLite/better-sqlite3"
```

---

### Task 9: Add docker-compose.yml and .env.example, remove fly.toml

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Delete: `fly.toml`

**Step 1: Create docker-compose.yml**

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - visito_data:/data
    environment:
      - DATABASE_PATH=/data/db.sqlite
      - NODE_ENV=production
    restart: unless-stopped
    command: sh -c "npx drizzle-kit push && node server.js"

volumes:
  visito_data:
```

**Step 2: Create .env.example**

```
# Path to the SQLite database file (default works with docker-compose)
DATABASE_PATH=/data/db.sqlite
```

**Step 3: Delete fly.toml**

```bash
git rm fly.toml
```

**Step 4: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: add docker-compose for self-hosted deployment, remove fly.toml"
```

---

### Task 10: Final verification

**Step 1: Run all tests**

```bash
npm test
```
Expected: All PASS

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: No errors

**Step 3: Build Docker image locally**

```bash
docker build -t visito .
```
Expected: Build succeeds

**Step 4: Test docker-compose up**

```bash
docker compose up
```
Expected: App starts, migrations run, server listens on port 3000. Visit `http://localhost:3000` to confirm.

**Step 5: Stop and clean up**

```bash
docker compose down
```
