# Data model implementation plan

**Source:** `.ai/PRD.json` (data_model, data_model_improvement_strategy, quality_tech_debt, file_ownership)  
**Date:** 2026-03-04

---

## 1. Summary of current state issues

- **Two sources of truth (library):** Canonical music-theory data is duplicated — `apps/api/src/seed.ts` and `apps/web/src/lib/libraryDefaults.ts`. Same scales/keys/modes exist in both; they are out of sync (e.g. seed missing Position 6, Position 7, positions 12–27).
- **ID mismatch:** The DB uses Prisma UUIDs for `LibraryItem`; the frontend uses stable slugs (e.g. `default:key:g`, `default:scale:major-ionian`). Worksheet JSON and diagram config reference those slugs. When the library is loaded from the API, resolution by `id` fails because the API returns UUIDs.
- **Worksheets not first-class:** Worksheets have no database or API. They exist only as static JSON in `public/worksheets/`, localStorage for the current worksheet, and a hardcoded list (labels + paths) in `App.tsx`. Adding a worksheet requires a code change and redeploy.
- **No single canonical identifier scheme:** Worksheet items use `keyId`/`scaleId`/`positionId` that are client slugs; there is no one canonical scheme for stored data (worksheets, project JSON, diagram config).

---

## 2. Strategy pillars (short)

| Pillar | Purpose |
|--------|--------|
| **library_strategy** | Single source of truth for library items; add `stableId` (or slug) to DB and API; align seed and frontend defaults so one source produces identical sets. |
| **worksheets_strategy** | First-class persistence: Worksheet table, list/single API, seed bundled worksheets from current JSON; frontend loads bundle list from API. |
| **id_scheme_strategy** | One canonical identifier for library items everywhere (worksheets, project JSON, diagram config). Prefer `stableId` (e.g. `default:key:g`) as the stored value; migrate existing data to that scheme. |
| **validation_and_schema** | Shared Worksheet/WorksheetItem schema (JSON Schema or Zod) in `packages/shared`; use at all ingress points (paste, file upload, API); optional `schemaVersion`/`sourceFormat` for compatibility. |

---

## 3. Step-by-step checklist (with owner and dependencies)

**File ownership (from PRD `parallel_agent_coordination.file_ownership`):**

- **prisma** — Database schema and seeds  
- **packages/shared** — Shared types  
- **apps/api** — API, persistence, and Prisma  
- **apps/web** — Frontend UI and canvas interactions  

Implementation order follows PRD `data_model.data_model_improvement_strategy.implementation_order`.

---

### Phase 1: Library (single source of truth + stableId)

| Step | Deliverable | Owner | Depends on |
|------|-------------|--------|------------|
| 1.1 | Define the canonical list of library items in one place (e.g. shared seed module or JSON in `packages/shared` or a dedicated data dir). | **packages/shared** (or shared data consumed by api + web) | — |
| 1.2 | Add `stableId` column to `LibraryItem` in Prisma (unique, e.g. `String @unique`). | **prisma** | — |
| 1.3 | Seed `LibraryItem` with `stableId` values (e.g. `default:key:g`, `default:scale:major-ionian`) using the single canonical source; ensure seed includes all positions/keys that frontend defaults had (Position 6, 7, 12–27). | **apps/api** (seed script) | 1.1, 1.2 |
| 1.4 | API: return `stableId` for library items (GET /api/library); ensure responses include it. | **apps/api** | 1.2 |
| 1.5 | Frontend: resolve library items by `stableId` (not by UUID); use `stableId` for key/scale/position selection and diagram config. | **apps/web** | 1.4 |
| 1.6 | Remove duplicated inline arrays from `apps/api/src/seed.ts` and `apps/web/src/lib/libraryDefaults.ts`; both consume the single canonical source (and frontend uses API or fallback keyed by `stableId`). | **apps/api**, **apps/web** | 1.1, 1.3, 1.5 |

---

### Phase 2: IDs (migrate to one scheme)

| Step | Deliverable | Owner | Depends on |
|------|-------------|--------|------------|
| 2.1 | Migrate existing worksheet JSON files (`public/worksheets/*.json`) so `keyId`/`scaleId`/`positionId` use the chosen scheme (stableId). | **apps/web** (or **packages/shared** if worksheets move to shared data) | Phase 1 |
| 2.2 | Migrate diagram references in project JSON (and any stored diagram config) so `keyId`/`scaleId`/`positionId` use stableId; ensure load/save and import/export use stableId. | **apps/web** | Phase 1 |
| 2.3 | Document the chosen ID scheme and migration rules for 6/7/8/9-string and tuning/fret-range compatibility (per PRD worksheets compatibility rules). | **packages/shared** or **docs** | 2.1, 2.2 |

---

### Phase 3: Worksheets (first-class persistence)

| Step | Deliverable | Owner | Depends on |
|------|-------------|--------|------------|
| 3.1 | Add `Worksheet` (or `WorksheetTemplate`) table in Prisma: e.g. `id`, `title`, `sourceRef`, `items` (JSONB), optional config, `isBundled`, `sortOrder`, `createdAt`/`updatedAt`. | **prisma** | — |
| 3.2 | API: implement GET /api/worksheets (list) and GET /api/worksheets/:id or ?slug= (single). | **apps/api** | 3.1 |
| 3.3 | Seed bundled worksheets from current `public/worksheets/*.json` (or shared data) into the Worksheet table. | **apps/api** | 3.1, 3.2 |
| 3.4 | Frontend: load worksheet bundle list from API instead of hardcoded array in App.tsx. | **apps/web** | 3.2 |
| 3.5 | Remove hardcoded worksheet labels + paths from App.tsx; use API response for list and for loading single worksheet content. | **apps/web** | 3.4 |

---

### Phase 4: Validation and schema

| Step | Deliverable | Owner | Depends on |
|------|-------------|--------|------------|
| 4.1 | In `packages/shared`, define JSON Schema or Zod for Worksheet and WorksheetItem (required fields, item shape, optional `schemaVersion`/`sourceFormat`). | **packages/shared** | — |
| 4.2 | API: validate worksheet payloads (e.g. POST/PATCH if added, or at least validate seed data) using the shared schema. | **apps/api** | 4.1 |
| 4.3 | Frontend: use shared parse-and-validate-worksheet at paste and file upload; surface user-facing errors for invalid files. | **apps/web** | 4.1 |
| 4.4 | (Optional) Add `schemaVersion` and `sourceFormat` to Worksheet model and shared schema for GP/MIDI/Reaper compatibility. | **prisma**, **packages/shared** | 3.1, 4.1 |
| 4.5 | Unify schema validation/normalization at all ingress points (API routes, localStorage project load, import) per quality_tech_debt. | **apps/api**, **apps/web** | 4.1, 4.2, 4.3 |

---

## 4. Dependency order between phases

- **Phase 1 (Library)** must be done first: stableId and single source are required so that worksheets and diagram config can reference one canonical scheme.
- **Phase 2 (IDs)** depends on Phase 1: migration of worksheet JSON and diagram references to stableId assumes the library exposes and uses stableId.
- **Phase 3 (Worksheets)** can proceed in parallel with Phase 2 after Phase 1; 3.1–3.2 do not depend on ID migration. 3.3–3.5 (seed and UI) are better after or in sync with 2.1 so bundled worksheets use stableIds.
- **Phase 4 (Validation)** can start anytime (4.1 is independent). 4.2–4.5 should use the same Worksheet/WorksheetItem shape as the DB and frontend; aligning with 3.1 and 3.4 avoids rework.

**Suggested execution order:** 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 2.1 → 2.2 → 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 4.1 → 4.2 → 4.3 → 4.4 (optional) → 4.5.  
(2.3 and 4.x can be interleaved where helpful.)

---

## 5. Quality / tech-debt alignment

- **Single source for library seed, stable IDs, worksheets as first-class, one ID scheme, shared validation** — addressed by Phases 1–4 and the checklist above.
- **Validate cached localStorage project payloads** — covered by step 4.5 (unify validation at ingress, including localStorage).
- **Unify schema validation/normalization at all ingress points** — explicitly step 4.5; supported by 4.1–4.3.
