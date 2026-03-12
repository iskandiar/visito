# Supabase Migration Design

**Date:** 2026-03-12
**Goal:** Replace better-sqlite3 (local SQLite) with Supabase (PostgreSQL) so the app can run on Vercel's free tier.

## Architecture

No structural changes to the app. The only change is swapping the database driver and making all DB calls async. The app remains a Next.js app deployed on Vercel, connecting to a Supabase PostgreSQL instance via the `postgres` (postgres.js) package and drizzle-orm.

Connection uses Supabase's pgBouncer pooler URL (port 6543, transaction mode) which is appropriate for Vercel serverless functions.

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Remove `better-sqlite3`, `@types/better-sqlite3`; add `postgres` |
| `lib/db/schema.ts` | `sqliteTable` → `pgTable`; timestamp column type |
| `lib/db/client.ts` | New driver using `postgres` + `drizzle-orm/postgres-js`; update `DrizzleDb` type |
| `lib/db/passes.ts` | All functions become `async` |
| `lib/db/entries.ts` | All functions become `async` |
| `app/api/passes/route.ts` | `await` all DB calls |
| `app/api/passes/[userLink]/route.ts` | `await` all DB calls |
| `app/api/passes/[userLink]/entries/route.ts` | `await` all DB calls; async transaction |
| `app/api/supervisor/[supervisorLink]/entries/[entryId]/route.ts` | `await` all DB calls |
| `drizzle.config.ts` | `dialect: 'postgresql'` |
| `.env.local.example` | Document `DATABASE_URL` format |

## Key Details

- **Driver:** `postgres` (postgres.js) with `drizzle-orm/postgres-js`
- **Singleton:** Keep `getDb()` pattern; postgres.js manages its own connection pool internally
- **Transaction:** `db.transaction(async (tx) => { ... })` replaces the sync SQLite transaction
- **Query API changes:**
  - `.get()` → `(await query)[0]` or use drizzle's `.then(r => r[0])`
  - `.all()` → `await query`
  - `.run()` → `await query`; success check via returned rows rather than `result.changes`
- **Timestamps:** `integer('created_at', { mode: 'timestamp' })` → `timestamp('created_at')`

## Environment

```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

(Transaction mode pooler from Supabase dashboard → Settings → Database → Connection string)
