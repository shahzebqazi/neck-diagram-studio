# Neck Diagrams Project Context

## Repository Snapshot

- Primary active code in this checkout lives in `frontend/` (Next.js + TypeScript + Zustand).
- Infrastructure and integration artifacts exist at repo root:
  - `docker-compose.yml`
  - `.env` / `.env.template`
  - `tests/database/run_tests.sql`
- Project README documents backend and nginx directories, but those paths may be absent in this local checkout.

## Entry Points and Ownership Hints

### App composition

- `frontend/src/app/page.tsx`: page composition and default project boot behavior.
- `frontend/src/components/`: UI surfaces (canvas, diagram, toolbar, settings, export, header).

### State management

- `frontend/src/stores/diagramStore.ts`: diagram CRUD, note operations, layout placement.
- `frontend/src/stores/canvasStore.ts`: zoom/pan, selection, viewport math.
- `frontend/src/stores/toolStore.ts`: note tool configuration and presets.
- `frontend/src/stores/authStore.ts`: auth state persistence and event-driven session sync.

### Integration and domain logic

- `frontend/src/lib/api.ts`: HTTP client, auth token lifecycle, API endpoint wrappers.
- `frontend/src/lib/music/scales.ts`: scale definitions/helpers.
- `frontend/src/lib/music/validation.ts`: music-domain validation helpers.
- `frontend/src/types/index.ts`: cross-app type contracts.

### Persistence behavior

- `frontend/src/hooks/useAutoSave.ts`: debounced save-to-API with localStorage fallback.

## Command Catalog

Run from repository root unless otherwise noted.

### Frontend development

- Install deps: `cd frontend && npm install`
- Start dev server: `cd frontend && npm run dev`
- Lint: `cd frontend && npm run lint`
- Build: `cd frontend && npm run build`

### Infrastructure checks

- Start database: `docker-compose up -d postgres`
- Start all declared services: `docker-compose up -d`

### Database data tests

- Intended command: `psql -d neck_diagrams -f tests/database/run_tests.sql`
- Container variant documented in SQL file comments.

## Working Rules for Orchestration

- Verify repository reality before planning:
  - `rg --files`
  - targeted `sed -n` reads for touched files
- Prefer focused patches over broad rewrites.
- Require at least one explicit verification step per changed subsystem.
- Flag mismatches between README architecture and current checkout as a risk in status updates.

## Codex Tread Model

Use these baseline treads for multi-step work:

- `discovery-tread`: confirm file truth, constraints, and acceptance criteria.
- `delivery-tread`: implement smallest viable slice first, then iterate.
- `verification-tread`: run checks, inspect regressions, and collect release evidence.
- `hardening-tread` (optional): performance/security cleanup after functional correctness.

Tread handoff format:

1. Completed actions.
2. Files touched or reserved.
3. Blockers/dependencies.
4. Next handoff target.

Avoid simultaneous edits in the same file across treads unless a merge order is explicitly documented.

## XP Execution Standards

Apply these standards on each story:

1. Story statement and acceptance criteria before edits.
2. Red-Green-Refactor loop per behavior change.
3. Pair-thinking: include a navigator challenge and resolution note.
4. Continuous integration gates:
- Frontend-only changes: `cd frontend && npm run lint` and scope-appropriate build/test checks.
- Infra/data changes: include relevant `docker-compose` or SQL validation commands.
5. Small release slices: prefer several narrow commits over one broad patch when feasible.

## Common Risk Areas

- Token refresh/logout interactions between `api.ts` and `authStore.ts`.
- Performance regressions from broad Zustand subscriptions.
- Canvas interaction regressions (pan, zoom, keyboard delete, multi-select).
- Assuming backend files/services exist without verifying local paths.
