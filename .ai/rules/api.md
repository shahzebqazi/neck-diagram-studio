# API rules — Neck Diagram Studio

Use when working on `apps/api`, routes, or API contracts. For full security and data model, see PRD.json.

## Endpoints

| Method | Path | Purpose |
|--------|------|--------|
| GET | `/api/projects/last` | Return last opened project (note: currently mutates `lastOpenedAt`; prefer moving touch to PATCH or separate endpoint). |
| POST | `/api/projects` | Create project. |
| PATCH | `/api/projects/:id` | Update project. Use explicit update object (title, data, lastOpenedAt only); do not pass arbitrary keys to Prisma. |
| GET | `/api/library?query=...` | Library search. Validate `type` query; return 400 for invalid values. |

## Security (from PRD)

- **CORS:** Allowlist origins explicitly; never use wildcard origins with credentials.
- **Input:** Define request body limits; validate untrusted inputs at route boundaries.
- **Headers:** Set security headers (Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, frame protection). Disable Express x-powered-by; custom 404/error handlers that do not leak stack traces in production.
- **Secrets:** Environment variables or secrets manager only; do not commit secrets.
- **Rate limiting:** Add for state-changing endpoints or at the edge.

## Implementation notes

- **.env path:** Resolve from file location (e.g. `__dirname` or `import.meta.url`), not `process.cwd()`, so .env loads when running from repo root.
- **PATCH projects:** Build explicit update object with only `title`, `data`, `lastOpenedAt` (as Date); type as Prisma `ProjectUpdateInput`. Do not spread request body into Prisma.
