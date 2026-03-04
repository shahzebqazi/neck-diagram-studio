# Security and API Hardening Plan

**Source:** `.ai/PRD.json` security_requirements, api_endpoints, backend_api, code_review_findings, quality_tech_debt  
**Scope:** API and middleware in `apps/api` (no code changes applied).

---

## 1. Security requirements vs status

### 1.1 security_requirements.api

| Requirement | Status | Notes |
|-------------|--------|--------|
| **Allowlist CORS origins explicitly; never use wildcard origins with credentials.** | **Implemented** | `app.ts`: `cors({ origin: allowlist from CLIENT_ORIGIN, credentials: true })`; throws if `*` is in `CLIENT_ORIGIN`. |
| **Define request body limits and validate untrusted inputs at route boundaries.** | **Implemented** | `express.json({ limit: "2mb" })`, `express.urlencoded({ limit: "1mb", extended: false, parameterLimit: 1000 })`. Projects routes use Zod for POST/PATCH; library GET validates `type` query and returns 400 for invalid. |

### 1.2 security_requirements.headers

| Requirement | Status | Notes |
|-------------|--------|--------|
| **Set security headers: Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, and clickjacking protection (frame-ancestors or X-Frame-Options).** | **Partial** | Helmet is used with `contentSecurityPolicy: false`, so **CSP is not set**. Helmet’s defaults provide X-Content-Type-Options and X-Frame-Options. Referrer-Policy is not explicitly configured (helmet 7 may set a default; not verified). **CSP and explicit Referrer-Policy / frame-ancestors are missing.** |
| **Disable Express x-powered-by and use custom 404 and error handlers that do not leak stack traces in production.** | **Implemented** | `app.disable("x-powered-by")`. Custom 404 returns `{ error: "Not found" }`. Error handler returns only `message` (or generic "Internal server error" for 500); **stack is not sent in responses.** |

### 1.3 security_requirements.abuse_protection

| Requirement | Status | Notes |
|-------------|--------|--------|
| **Add rate limiting for state-changing endpoints or enforce limits at the edge.** | **Implemented** | `express-rate-limit` applied to `/api/projects` (window 15 min, 300 requests); skips GET/HEAD/OPTIONS. Library GET is not rate-limited (read-only). |

### 1.4 security_requirements.secrets

| Requirement | Status | Notes |
|-------------|--------|--------|
| **Store secrets in environment variables or a secrets manager; do not commit secrets to the repo.** | **Implemented** | `.env` and `.env.*` are in `.gitignore`; API uses `process.env` (e.g. `CLIENT_ORIGIN`, `PORT`, and DB via Prisma). Known bug: `.env` path in `index.ts`/`seed.ts` uses `process.cwd()` and can resolve outside repo when run from root—does not change the “secrets not committed” requirement. |

### 1.5 security_requirements.data

| Requirement | Status | Notes |
|-------------|--------|--------|
| **Do not expose database ports publicly in production; restrict access to private networks.** | **Unverified** | App does not bind the DB port; Prisma uses `DATABASE_URL`. Restricting DB to a private network is a **deployment/infrastructure** concern (e.g. GitLab Pages + separate API/DB hosting). Not verifiable from repo alone. |

---

## 2. API endpoints and code review (API-related)

- **GET /api/projects/last** – Implemented; known design issue: mutates `lastOpenedAt` (GET side effect).
- **POST /api/projects** – Implemented; Zod validation at route boundary.
- **PATCH /api/projects/:id** – **Partial:** Zod validates body and 400 for empty patch; PRD/code_review: update payload is built as `Record<string, unknown>` and passed to `prisma.project.update()`. Should build an **explicit update object** with only `title`, `data`, `lastOpenedAt` (as Date) typed as `Prisma.ProjectUpdateInput` to avoid extra keys and type-unsafe spread.
- **GET /api/library?query=...** – Implemented; `type` query validated against allowlist, 400 for invalid type.

**backend_api** in PRD is empty; no additional backend API requirements listed.

**quality_tech_debt** (validation / CORS / backend):

- Unify schema validation/normalization at all ingress points (API routes, localStorage, import).
- Replace placeholder lint scripts with real linting and add API integration tests.
- Validate cached localStorage project payloads against schema and fall back safely.

---

## 3. Security and API checklist (ordered)

Order aims to reduce risk and build on basics first: CORS and body limits are already in place; next are headers, then validation/type safety, then operational hardening.

1. **Add explicit CSP (or helmet CSP) and Referrer-Policy in apps/api**  
   Enable helmet’s Content-Security-Policy (or set a minimal CSP) and set Referrer-Policy (e.g. `strict-origin-when-cross-origin`). Ensure frame-ancestors or X-Frame-Options remains in place (already via helmet default).

2. **Harden security headers in apps/api**  
   Explicitly set X-Content-Type-Options (e.g. `nosniff`), Referrer-Policy, and frame-ancestors (or keep X-Frame-Options) so behavior is explicit and documented rather than relying only on helmet defaults.

3. **Fix PATCH /api/projects/:id update payload**  
   Build an explicit update object with only `title`, `data`, and `lastOpenedAt` (Date), typed as `Prisma.ProjectUpdateInput`; do not pass a generic `Record<string, unknown>` or spread all patch keys into `prisma.project.update()`.

4. **Fix .env path in apps/api**  
   Resolve `.env` path from `__dirname` / `import.meta.url` (or equivalent) so it works when running from repo root; apply in `apps/api/src/index.ts` and `apps/api/src/seed.ts`.

5. **Avoid logging full error object in production (apps/api error handler)**  
   In the global error handler, log only a safe message (or omit stack) in production so stack traces are not written to logs that might be exposed.

6. **Document or enforce DB network restriction**  
   Document that in production the database must not be exposed to the public internet (private network / VPC only), or enforce via deployment/network config.

7. **Replace placeholder lint scripts with real ESLint**  
   In `apps/api` (and `apps/web` per PRD), replace `echo "(lint)"` with real ESLint and run in CI.

8. **Add API integration tests**  
   Add tests for `/api/projects` and `/api/library` (success and error cases, including 400 for invalid type and 404/400 for PATCH) as in PRD testing requirements.

9. **Unify validation at ingress**  
   Use shared schema (e.g. Zod) at API routes, localStorage load, and import flows so validation and normalization are consistent (per quality_tech_debt and data_model validation strategy).

10. **Optional: rate limit GET /api/library**  
    If abuse (e.g. scraping or DoS) is a concern, add a separate read limiter or include GET in a general limit; PRD only requires rate limiting for state-changing endpoints, so this is optional.

---

## 4. Suggested implementation order (minimize risk)

1. **CORS and body limits** – Already done; no change.
2. **Headers (CSP, Referrer-Policy, explicit X-Content-Type-Options, frame-ancestors)** – Reduces XSS and framing risk with no change to business logic.
3. **Body/input and type safety** – Fix PATCH explicit update object and .env path; reduces type and config bugs.
4. **Error handling** – Avoid logging full errors in production.
5. **Operational and quality** – DB access docs, real lint, API integration tests, unified validation.

---

## 5. Notes on Express / Prisma (from PRD and codebase)

- **Express:** App is created in `app.ts` with `createApp()`. Middleware order: disable x-powered-by → helmet → cors → json/urlencoded → write rate limiter (on projects) → routes → 404 → error handler. No session/auth middleware yet; `credentials: true` is set for CORS for future cookie use.
- **Prisma:** Single global `PrismaClient` in `db.ts`; PRD/code_review notes this is fine for long-running Express; if moving to serverless, use a singleton per process.
- **Validation:** Projects routes use Zod (`projectSchema`, `patchSchema`); library uses an allowlist set for `type`. PATCH still passes a constructed object to Prisma that is not explicitly typed as `ProjectUpdateInput`.
- **SPA vs API:** Security headers in this plan target the API (`apps/api`). The SPA (e.g. GitLab Pages) may need its own headers (CSP, X-Frame-Options, etc.) at the host or CDN; that is out of scope for this API-focused plan.

---

*Generated from PRD.json and apps/api codebase review. No code changes were applied.*
