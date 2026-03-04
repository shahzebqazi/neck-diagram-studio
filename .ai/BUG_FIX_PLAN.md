# Bug-fix plan

Based on `.ai/PRD.json` and `.ai/PRD.md`: **known_issues** (bugs, design issues) and **code_review_findings.bugs** / **code_review_findings.prioritized**. Owning areas from **parallel_agent_coordination.file_ownership**.

---

## API (apps/api)

**Owner:** API, persistence, and Prisma

| # | Issue | PRD-suggested fix / location |
|---|--------|-----------------------------|
| 1 | **API .env path:** `process.cwd() + '../../.env'` resolves outside repo when running from repo root (e.g. `npm run dev`); .env is never loaded. | Resolve relative to file (e.g. `import.meta.url` / `__dirname`) in `apps/api/src/index.ts` and `apps/api/src/seed.ts`. |
| 2 | **PATCH /api/projects/:id:** Update payload is `Record<string, unknown>` passed to Prisma; type-unsafe and allows extra keys. | Build an explicit update object with only `title`, `data`, `lastOpenedAt` (as `Date`) and type it as Prisma `ProjectUpdateInput`. |
| 3 | **Design – GET /api/projects/last:** Mutates `lastOpenedAt` in DB; GET should be side-effect free. | Move “touch” to a separate endpoint or to the existing PATCH save flow. |

---

## Frontend (apps/web)

**Owner:** Frontend UI and canvas interactions

| # | Issue | PRD-suggested fix / location |
|---|--------|-----------------------------|
| 4 | **Docs CTAs unstyled:** `.cta-button` is not defined in styles; Docs page CTAs are unstyled. | Add `.cta-button`, `.cta-button.primary`, `.cta-button.ghost` (or reuse `.lp-btn`/`.lp-cta`) in `apps/web` styles so Docs matches the rest of the site. |
| 5 | **Error state never shown:** Boot never sets `status === 'error'`; on failure app falls back to local/blank and stays `ready`. | Handle `status === 'error'` explicitly: set `status('error')` when remote and local fallback both fail; show message and actions (e.g. “Start blank project”, “Retry”) in `App.tsx` / root UI. |
| 6 | **Delete modal a11y:** No focus trap, no return-focus, no `aria-labelledby` on dialog; Enter can confirm delete by accident. | Add focus trap, focus “Cancel” (or first non-destructive element) on open, restore focus on close, and `aria-labelledby` (and optional `aria-describedby`) on the dialog in `apps/web`. |

---

## Export (PNG/PDF)

**Owner:** Frontend UI and canvas interactions (export logic in `apps/web`)

| # | Issue | PRD-suggested fix / location |
|---|--------|-----------------------------|
| 7 | **PNG/PDF export does not prompt for filename:** Users cannot name the file before download. | Prompt for a filename (e.g. input or save dialog) before starting download in `apps/web` export flow (e.g. `App.tsx` around PNG/PDF export). |
| 8 | **PNG/PDF export renders black output in some cases:** Exports must preserve diagram colors. | Fix export pipeline so rendered output preserves diagram colors (e.g. canvas/context or export options in `apps/web`). |

---

## Canvas / Layout (apps/web)

**Owner:** Frontend UI and canvas interactions

| # | Issue | PRD-suggested fix / location |
|---|--------|-----------------------------|
| 9 | **Viewport resize:** Resizing the browser viewport does not keep diagrams centered; diagrams drift to the right. | Recompute canvas offset/center on resize so diagrams stay centered (e.g. resize listener and centering logic in `App.tsx`). |
| 10 | **Fret labels vs title:** Fret number labels overlap the diagram title. | Move the diagram title above the diagram rather than below (e.g. `NeckDiagram.tsx` or parent layout). |
| 11 | **27 frets on narrow diagrams:** Selecting 27 frets causes very dense fret spacing; labels become unreadable. | Enforce a minimum width and/or adaptive fret label thinning (e.g. render every Nth label when spacing is tight) in `apps/web` (e.g. `NeckDiagram.tsx` or diagram layout). |

---

## Other

**Owner:** per row below

| # | Issue | PRD-suggested fix / location | Owner |
|---|--------|-----------------------------|--------|
| 12 | **NeckConfig missing `multiscaleAngle`:** `NeckDiagram.tsx` uses `config.multiscaleAngle` but `NeckConfig` in shared types does not declare it. | Add `multiscaleAngle?: number` to `NeckConfig` in `packages/shared/src/types.ts`. | Shared types |
| 13 | **Lint scripts are placeholders:** `apps/api` and `apps/web` lint scripts only echo; no real linting or CI. | Replace with real ESLint (and optional eslint-plugin-react-hooks); run in CI. | apps/api, apps/web |
| 14 | **Tests use loose types:** `projectData.test.ts` uses `as any` and loose casts. | Prefer typed test helpers or narrow casts to keep tests type-safe. | apps/web (tests) |

---

## Suggested implementation order

1. **Fix API .env path** (`apps/api`) — unblocks correct config and all API usage; file-local resolution only.
2. **Add `multiscaleAngle` to `NeckConfig`** (`packages/shared`) — removes type lie and prevents regressions; no behavior change.
3. **Fix PATCH /api/projects/:id** (`apps/api`) — explicit `ProjectUpdateInput`; small, contained API change.
4. **GET /api/projects/last side effect** (`apps/api`) — move touch to PATCH or new endpoint; depends on PATCH behavior.
5. **PNG/PDF: prompt for filename** (`apps/web`) — improves UX without touching render path.
6. **PNG/PDF: preserve colors** (`apps/web`) — fix black export; may need canvas/context or export options.
7. **Canvas: viewport resize centering** (`apps/web`) — resize handler + centering math; no API/shared changes.
8. **Canvas: title above diagram** (`apps/web`) — layout change in `NeckDiagram` or parent; low risk.
9. **Error state UI** (`apps/web`) — set `status('error')` and add “Start blank / Retry”; improves robustness.
10. **Delete modal a11y + Docs .cta-button** (`apps/web`) — focus trap, aria, and CTA styles; can be done in one pass.

Optional follow-ups (after the above): 27-fret spacing / label thinning, placeholder lint → real ESLint + CI, and tightening `projectData.test.ts` types.
