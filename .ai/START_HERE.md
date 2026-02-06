# START HERE

This file is the **initialization entrypoint** for the AI agent orchestrator and project director.
Initialize with `START_HERE.md`.

## Project
- **Name:** Neck Diagram Studio
- **Purpose:** Create and arrange guitar neck diagrams with an Excalidraw-like experience.

## How to Run
1. `npm install`
2. `cp .env.example .env`
3. `docker compose up -d`
4. `npm run prisma:generate`
5. `npm run prisma:migrate`
6. `npm run seed`
7. `npm run dev`

## Architecture
- **Frontend:** `apps/web` (React + Vite + TypeScript)
- **Backend:** `apps/api` (Express + Prisma + TypeScript)
- **Database:** PostgreSQL
- **Shared:** `packages/shared` (TypeScript types)

## Key Features
- Blank project canvas on creation.
- Toolbar with + button to add new necks.
- Move/resize/scale necks with mouse + modifier keys.
- Draw notes in diagrams and label by key/interval/picking.
- Searchable library of scales/modes/shapes.
- Persistence to Postgres with localStorage fallback.

## Primary Files
- `apps/web/src/App.tsx`
- `apps/web/src/components/NeckDiagram.tsx`
- `apps/web/src/lib/tiling.ts`
- `apps/api/src/index.ts`
- `apps/api/src/routes/projects.ts`
- `prisma/schema.prisma`

## Conventions
- Use shared types from `packages/shared` when crossing API boundaries.
- Keep UI state normalized; diagrams are top-level entities with notes as children.
- Use the tiling helper for suggested placement of new diagrams.
- Persist on change with debounce; always update localStorage immediately.

## Agent Prompt
You are working on Neck Diagram Studio. Follow `PRD.json`. Keep UI Excalidraw-inspired. Avoid modifying files owned by another agent. Prefer small, isolated changes. If you need to change architecture, propose it first.
