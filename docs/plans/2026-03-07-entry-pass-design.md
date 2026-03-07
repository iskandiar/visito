# Entry Pass App — Design Document

**Date:** 2026-03-07

## Overview

A lightweight web application for managing passes with a limited number of entries (gym visits, classes, activity passes). Passes are created with a fixed entry count and issued via unique links. Entries are recorded by visiting the link on a phone.

## Stack

- **Framework:** Next.js 15, App Router, TypeScript
- **Database:** SQLite via Drizzle ORM + `better-sqlite3`
- **Styling:** Tailwind CSS + shadcn/ui
- **Hosting:** Fly.io — single machine + persistent volume mounted at `/data/app.db`
- **Testing:** Vitest (unit + integration, in-memory SQLite)

## Architecture

- All data access is server-side (React Server Components + Route Handlers)
- No auth system — security via unguessable UUIDs for user and supervisor links
- SQLite on a persistent volume: zero DB cost, single-process writes appropriate for this scale
- No client-side DB calls

## Data Model

### `passes`

| column            | type      | notes                                   |
|-------------------|-----------|-----------------------------------------|
| `id`              | UUID (PK) | internal ID                             |
| `name`            | text      | e.g. "Anna - Yoga 10-pack"              |
| `total_entries`   | integer   | fixed at creation                       |
| `user_link`       | UUID      | public token → `/p/[user_link]`         |
| `supervisor_link` | UUID      | supervisor token → `/s/[supervisor_link]` |
| `created_at`      | timestamp | issue date                              |

### `entries`

| column       | type      | notes                              |
|--------------|-----------|------------------------------------|
| `id`         | UUID (PK) |                                    |
| `pass_id`    | UUID (FK) | references passes.id               |
| `visit_date` | text      | YYYY-MM-DD, no future dates        |
| `comment`    | text      | nullable, optional note            |
| `created_at` | timestamp | exact timestamp of recording       |

## Pages

| Route                | Description                                              |
|----------------------|----------------------------------------------------------|
| `/`                  | Landing — hero + "Create a pass" form                    |
| `/p/[userLink]`      | Pass view — entry grid + add entry button                |
| `/s/[supervisorLink]` | Supervisor view — same + edit/delete per entry          |

## API Route Handlers

| Method   | Route                                                        | Action                                   |
|----------|--------------------------------------------------------------|------------------------------------------|
| `POST`   | `/api/passes`                                                | Create pass → returns both links         |
| `GET`    | `/api/passes/[userLink]`                                     | Fetch pass + entries by user link        |
| `POST`   | `/api/passes/[userLink]/entries`                             | Add an entry (pass must not be full)     |
| `PATCH`  | `/api/supervisor/[supervisorLink]/entries/[entryId]`         | Edit entry date/comment                  |
| `DELETE` | `/api/supervisor/[supervisorLink]/entries/[entryId]`         | Delete an entry                          |

## UX Flows

- **Add entry:** floating button → mobile bottom sheet with date picker (default today, max today) + optional comment → submit
- **Pass full:** button replaced with "Pass is full — issue a new one" message
- **After creation:** landing page shows both links prominently with copy buttons; supervisor link marked as sensitive
- **Supervisor page:** visually identical to pass page, but each used entry has edit/delete icons

## Error Handling

- Route handlers return typed JSON errors with appropriate HTTP status codes:
  - 400 — validation errors (future date, missing fields)
  - 404 — unknown link
  - 409 — pass is full
- Pages use Next.js `error.tsx` and `not-found.tsx` for graceful UI errors
- Future date validation enforced both client-side (date picker `max`) and server-side
- Entry count check is atomic: `COUNT(entries)` vs `total_entries` before insert

## Testing

All tests use Drizzle with an in-memory SQLite DB (`:memory:`) — no mocking, real SQL.

| File                          | Coverage                                              |
|-------------------------------|-------------------------------------------------------|
| `passes.test.ts`              | Create pass, unique link generation, entry limits     |
| `entries.test.ts`             | Add entry, reject future dates, reject when full      |
| `routes/passes.test.ts`       | POST `/api/passes` — happy path + validation          |
| `routes/entries.test.ts`      | POST add, PATCH edit, DELETE — happy + error cases    |
| `routes/supervisor.test.ts`   | Invalid supervisor link returns 404                   |

## Deployment

- Fly.io single machine (`fly.toml`)
- Persistent volume at `/data`, `DATABASE_URL=file:/data/app.db`
- Drizzle `push` on startup to apply schema
- No CI/CD required for MVP; deploy via `fly deploy`
