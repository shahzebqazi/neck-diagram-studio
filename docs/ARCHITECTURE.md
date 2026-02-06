# Architecture

## Monorepo layout
- `apps/web`: React + Vite client
- `apps/api`: Express + Prisma API
- `packages/shared`: shared TypeScript types
- `prisma`: Prisma schema

## Data flow
1. The web app loads the last project from `GET /api/projects/last`.
2. If the API is unavailable, it falls back to the local cache.
3. The web app auto-saves to Postgres and caches the latest project in `localStorage`.

## Local cache
The latest project is stored in `localStorage` under:
- `neck-diagram:last-project`

UI preferences are stored under:
- `neck-diagram:sidebar-collapsed`
- `neck-diagram:page-date`
- `neck-diagram:delete-warning`
- `neck-diagram:theme`

## Data model
Prisma models (see `prisma/schema.prisma`):
- `Project`: `id`, `title`, `data` (JSON), `lastOpenedAt`
- `LibraryItem`: `type`, `name`, `intervals`, `description`

## API endpoints
- `GET /api/health`
- `GET /api/projects/last`
- `POST /api/projects`
- `PATCH /api/projects/:id`
- `GET /api/library?query=...&type=...`
