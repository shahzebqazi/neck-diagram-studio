# Security Best Practices Report — Neck Diagram Studio

## Executive Summary
Reviewed the Express API (`apps/api`) and React/Vite frontend (`apps/web`) for secure-by-default practices. No critical vulnerabilities were found, but several baseline protections are missing or rely on implicit/default behavior. The most important gaps are: missing security headers/error handling in the API, weak input validation for project/library inputs, permissive CORS configuration risk if misconfigured, and no rate limiting on state‑changing endpoints. The SPA also lacks an in-repo CSP or security header configuration (verify at the edge).

## Medium Findings

### F-001 — Missing security headers middleware in the API
- Rule ID: EXPRESS-HEADERS-001
- Severity: Medium
- Location: `apps/api/src/index.ts:13-25`
- Evidence:
  ```ts
  const app = express();
  const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  app.use("/api/projects", projectsRouter);
  app.use("/api/library", libraryRouter);
  ```
- Impact: API responses lack baseline protections such as `X-Content-Type-Options`, clickjacking protection, and (where relevant) CSP; this increases exposure to common web attacks and makes browser behavior less predictable.
- Fix: Add `helmet()` early in the middleware stack and configure it appropriately for the API (and any HTML responses if served). Ensure a CSP is delivered for the SPA at the edge/server if the API does not serve it.
- Mitigation: If headers are set at a reverse proxy/CDN, document them and verify at runtime (response headers).
- False positive notes: If a gateway/CDN already injects these headers, this finding is mitigated but should be documented and verified.

### F-002 — CORS allowlist is environment-driven without validation (credentials enabled)
- Rule ID: EXPRESS-CORS-001
- Severity: Medium
- Location: `apps/api/src/index.ts:15-18`
- Evidence:
  ```ts
  const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
  app.use(cors({ origin: clientOrigin, credentials: true }));
  ```
- Impact: If `CLIENT_ORIGIN` is misconfigured (e.g., set to `*` or an unexpected domain), the API could unintentionally allow cross‑origin credentialed requests or broaden access.
- Fix: Validate `CLIENT_ORIGIN` against a strict allowlist (array of known origins) and reject invalid values at boot. Prefer `origin: (origin, cb) => cb(null, allowlist.has(origin))` with explicit logging on rejects.
- Mitigation: Enforce origin allowlists at the edge (API gateway) and keep `credentials: true` only when needed.
- False positive notes: If deployment tooling already guarantees a safe `CLIENT_ORIGIN`, risk is lower but still depends on configuration hygiene.

### F-003 — Unvalidated project payloads and library type allow invalid data and runtime errors
- Rule ID: EXPRESS-INPUT-001
- Severity: Medium
- Location: `apps/api/src/routes/projects.ts:7-16`, `apps/api/src/routes/library.ts:6-12`
- Evidence:
  ```ts
  const projectSchema = z.object({
    title: z.string().min(1).max(200),
    data: z.unknown().optional()
  });
  ```
  ```ts
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  ...
  ...(type ? { type } : {}),
  ```
- Impact: `data` is stored without schema validation, enabling malformed/hostile structures that can break the UI or cause unexpected behavior. Passing an invalid `type` can throw Prisma errors, resulting in 500 responses (potentially exploitable for DoS).
- Fix: Define a Zod schema for `ProjectData` (or validate key fields) and reject invalid payloads. Validate `type` using a strict enum (`z.enum(["scale","mode","shape","position","key"])`) and return 400 on invalid values.
- Mitigation: Add defensive parsing in the UI and log rejected payloads for visibility.
- False positive notes: If an upstream gateway validates these inputs, impact is reduced but still worth enforcing in-app.

### F-004 — No rate limiting for state‑changing endpoints
- Rule ID: EXPRESS-AUTH-001
- Severity: Medium
- Location: `apps/api/src/index.ts:17-25`
- Evidence:
  ```ts
  app.use("/api/projects", projectsRouter);
  app.use("/api/library", libraryRouter);
  ```
- Impact: POST/PATCH endpoints can be brute‑forced or abused, leading to resource exhaustion or noisy data updates.
- Fix: Add rate limiting (e.g., `express-rate-limit`) for POST/PATCH routes, or enforce limits at the edge (preferred).
- Mitigation: Apply database-level constraints and monitor for abusive patterns.
- False positive notes: If rate limiting exists at an API gateway/WAF, this is mitigated but should be documented.

## Low Findings

### F-005 — Missing explicit API fingerprinting and error handlers
- Rule ID: EXPRESS-FINGERPRINT-001, EXPRESS-ERROR-001
- Severity: Low
- Location: `apps/api/src/index.ts:13-30`
- Evidence:
  ```ts
  const app = express();
  ...
  app.use("/api/projects", projectsRouter);
  app.use("/api/library", libraryRouter);

  app.listen(port, () => {
    console.log(`API listening on :${port}`);
  });
  ```
- Impact: The default `X-Powered-By: Express` header remains enabled and default error responses may leak stack traces in non-production or misconfigured environments.
- Fix: Add `app.disable("x-powered-by")` and custom 404/error middleware that returns generic messages in production.
- Mitigation: Ensure `NODE_ENV=production` and hide stack traces at the proxy layer if applicable.
- False positive notes: If errors are centrally handled by a gateway, client exposure is reduced but still advisable to implement in-app.

### F-006 — No CSP/security headers are defined for the SPA in-repo (verify at edge)
- Rule ID: REACT-HEADERS-001 / JS-CSP-001
- Severity: Low
- Location: `apps/web/index.html:1-35`
- Evidence:
  ```html
  <head>
    <meta charset="UTF-8" />
    ...
    <title>Neck Diagram Studio</title>
  </head>
  ```
- Impact: Without CSP and related headers, the SPA has less defense‑in‑depth against XSS and clickjacking.
- Fix: Configure CSP, `X-Content-Type-Options`, `Referrer-Policy`, and clickjacking protection at the hosting layer (preferred). If hosting is purely static, consider adding CSP via response headers (or meta as a fallback with documented limitations).
- Mitigation: Avoid unsafe DOM sinks and keep third‑party scripts minimal (already good in this repo).
- False positive notes: If the CDN/edge already injects CSP and related headers, document and verify them via response headers.

## Notes
- No evidence of unsafe DOM sinks (`innerHTML`, `dangerouslySetInnerHTML`, `eval`) in the React codebase.
- No cookie-based authentication was found; CSRF protections are likely not applicable in the current setup.

