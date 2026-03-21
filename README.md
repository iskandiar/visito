# Visito

A lightweight web app for managing passes with a limited number of entries — gym visits, yoga classes, or any activity with a fixed count.

## Features

- Create passes with a custom entry count (8, 10, 12, 24, or any number)
- Each pass gets a shareable **user link** and a private **supervisor link**
- Record visits with an optional date adjustment and comment
- Supervisor link allows editing or deleting entries
- Mobile-first, fast, no login required

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **SQLite** via Drizzle ORM + better-sqlite3
- **Tailwind CSS** + shadcn/ui
- **Vitest** for unit/integration tests
- **Docker** for self-hosted deployment

## Development

```bash
npm install
npx drizzle-kit push   # creates dev.db
npm run dev
npm test
```

## Self-Hosted Deployment

Requires Docker and Docker Compose.

```bash
docker compose up -d --build
```

The app runs on port 3000. Data persists in a Docker volume (`visito_data`) at `/data/db.sqlite`.

To update:

```bash
git pull
docker compose up -d --build
```

## Project Structure

```
app/
  api/
    passes/                       # POST create pass
    passes/[userLink]/            # GET pass + entries
    passes/[userLink]/entries/    # POST add entry
    supervisor/[supervisorLink]/entries/[entryId]/  # PATCH/DELETE entry
  p/[userLink]/                   # Pass view (public)
  s/[supervisorLink]/             # Supervisor view (private)
lib/db/
  schema.ts     # Drizzle schema (passes + entries)
  client.ts     # DB singleton (WAL mode, foreign keys)
  passes.ts     # Pass query functions
  entries.ts    # Entry query functions
scripts/
  migrate.mjs   # Creates tables on startup
__tests__/
  db/           # Query function tests
  routes/       # Route handler tests
```

## URLs

After creating a pass:

- **User link** `/p/<uuid>` — share with the pass holder to record visits
- **Supervisor link** `/s/<uuid>` — keep private; allows editing and deleting entries
