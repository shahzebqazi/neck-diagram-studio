# Neck Diagram Studio — Project context for Claude

**Project:** Neck Diagram Studio  
**Purpose:** Create and arrange guitar neck diagrams with an Excalidraw-like experience (TypeScript, React, Express, PostgreSQL).

**Full project context:** Read [START_HERE.md](START_HERE.md) first. For detailed requirements and conventions, see [PRD.md](PRD.md) and [PRD.json](PRD.json). Domain rules are in [rules/](rules/).

- **Stack:** Frontend `apps/web` (React + Vite + TS), Backend `apps/api` (Express + Prisma + TS), DB PostgreSQL, shared types in `packages/shared`.
- **Run:** `npm install` → `cp .env.example .env` → `docker compose up -d` → `npm run prisma:generate` → `npm run prisma:migrate` → `npm run seed` → `npm run dev`.
- **Key paths:** `apps/web/src/App.tsx`, `apps/web/src/components/NeckDiagram.tsx`, `apps/api/src/index.ts`, `prisma/schema.prisma`.

Follow the PRD; keep UI Excalidraw-inspired; prefer small, isolated changes.
