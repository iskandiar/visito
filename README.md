# Entry Pass

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
- **Tailwind CSS** + shadcn/ui (base-nova style)
- **Vitest** for unit/integration tests
- **Fly.io** for hosting (single machine + persistent volume)

## Development

```bash
# Install dependencies
npm install

# Push schema to create dev.db
npx drizzle-kit push

# Start dev server
npm run dev

# Run tests
npm test
```

## Project Structure

```
app/
  api/
    passes/           # POST create pass; GET by user link
    passes/[userLink]/entries/  # POST add entry
    supervisor/       # PATCH/DELETE entry via supervisor link
  p/[userLink]/       # Pass view page (public)
  s/[supervisorLink]/ # Supervisor view page (private)
  page.tsx            # Landing page
lib/db/
  schema.ts           # Drizzle schema (passes + entries tables)
  client.ts           # DB singleton (WAL mode, foreign keys)
  passes.ts           # Pass query functions
  entries.ts          # Entry query functions
components/
  create-pass-form.tsx      # Landing page form
  entry-grid.tsx            # Entry slot grid
  add-entry-sheet.tsx       # Bottom sheet for recording visits
  supervisor-entry-grid.tsx # Grid with edit/delete for supervisor
__tests__/
  db/                 # Query function tests
  routes/             # Route handler tests (with vi.mock)
  helpers/            # Shared test DB helper
```

## Deployment (Fly.io)

```bash
# One-time setup
fly launch --no-deploy
fly volumes create entry_pass_data --size 1
fly secrets set DATABASE_URL=file:/data/app.db

# Deploy
fly deploy
```

The persistent volume mounts at `/data`. SQLite writes to `/data/app.db`. Schema is applied automatically by `drizzle-kit push` on first setup.

## URLs

After creating a pass:

- **User link** `/p/<uuid>` — share with the pass holder to record visits
- **Supervisor link** `/s/<uuid>` — keep private; allows editing and deleting entries
