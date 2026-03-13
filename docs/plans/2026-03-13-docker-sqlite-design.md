# Docker + SQLite Migration Design

**Date:** 2026-03-13
**Goal:** Run the app in a single Docker container on TrueNAS (homelab), accessed via Cloudflare Tunnel. Revert the database from PostgreSQL (Supabase) back to SQLite for simplicity.

## Architecture

Single Next.js container with SQLite stored on a named Docker volume at `/data/db.sqlite`. Cloudflared is managed separately on TrueNAS. Migrations run automatically on container startup via `drizzle-kit push`.

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Remove `postgres`; add `better-sqlite3`, `@types/better-sqlite3` |
| `lib/db/schema.ts` | `pgTable` → `sqliteTable`; `timestamp` → `integer({ mode: 'timestamp' })` |
| `lib/db/client.ts` | Swap driver to `BetterSQLite3Database`; open file at `process.env.DATABASE_PATH ?? '/data/db.sqlite'` |
| `lib/db/passes.ts` | Make functions synchronous (remove `async`/`await`) |
| `lib/db/entries.ts` | Make functions synchronous (remove `async`/`await`) |
| `app/api/passes/route.ts` | Remove `await` from DB calls |
| `app/api/passes/[userLink]/route.ts` | Remove `await` from DB calls |
| `app/api/passes/[userLink]/entries/route.ts` | Remove `await` from DB calls; sync transaction |
| `app/api/supervisor/[supervisorLink]/entries/[entryId]/route.ts` | Remove `await` from DB calls |
| `drizzle.config.ts` | `dialect: 'sqlite'`; `dbCredentials: { url: '/data/db.sqlite' }` |
| `Dockerfile` | Fix stale references; multi-stage build with `better-sqlite3` native rebuild |
| `docker-compose.yml` | New file; single service with `/data` volume; auto-migrate on startup |
| `.env.example` | Document `DATABASE_PATH` |
| `fly.toml` | Delete (no longer relevant) |

## Docker Details

### Dockerfile
- Base: `node:22-alpine`
- Install `python3 make g++` for native module compilation
- Multi-stage: deps → builder (full build) → runner (standalone output)
- Rebuild `better-sqlite3` in runner stage
- `/data` directory created for SQLite file
- `EXPOSE 3000`, `ENV PORT=3000 HOSTNAME="0.0.0.0"`

### docker-compose.yml
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
    restart: unless-stopped
    command: sh -c "npx drizzle-kit push && node server.js"

volumes:
  visito_data:
```

## Environment

```
DATABASE_PATH=/data/db.sqlite   # default, override if needed
```

## Key Details

- **Driver:** `better-sqlite3` with `drizzle-orm/better-sqlite3`
- **Sync API:** All DB functions return values directly (no promises)
- **Migrations:** `drizzle-kit push` runs on every container start (idempotent)
- **Backup:** Copy the named volume's `db.sqlite` file
- **Cloudflared:** Managed separately on TrueNAS, tunnels to `localhost:3000`
