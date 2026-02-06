# Neck Diagram Studio

A TypeScript + PostgreSQL app for drawing and arranging guitar neck diagrams. The UI is inspired by Excalidraw: a clean canvas, a top toolbar, and fast iteration on a blank page.

## Quick Start (local)
1. `npm install`
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. `docker compose up -d` (optional, for local Postgres)
4. `npm run prisma:generate`
5. `npm run prisma:migrate`
6. `npm run seed`
7. `npm run dev`

The API runs at `http://localhost:3001` and the web app at `http://localhost:5173`.

## Project Layout
- `apps/api`: Express + Prisma API backed by Postgres.
- `apps/web`: React + Vite front-end.
- `packages/shared`: Shared TypeScript types.
- `prisma`: Prisma schema and seed data.

## Notes
- The app persists the most recent project to Postgres and caches it in `localStorage`.
- New projects start with a blank canvas.
- Holding `Alt` while dragging resizes a neck; `Alt+Shift` scales proportionally.

