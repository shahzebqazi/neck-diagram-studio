# PRD summary — Neck Diagram Studio

Full machine-readable spec: **[PRD.json](PRD.json)**. Use this file for a quick overview; refer to PRD.json for functional requirements, data model, API, security, known issues, and quality/tech-debt.

## Project

- **Name:** Neck Diagram Studio  
- **Version:** 0.1.0  
- **Summary:** TypeScript + PostgreSQL app for creating and arranging guitar neck diagrams with an Excalidraw-inspired workflow.

## Goals (high level)

- Blank canvas; add/move/resize/scale neck diagrams; configurable neck options (strings, frets, scale length, capo).
- Draw notes with label modes (key, interval, picking); persist last-opened project; searchable scale/mode/shape library.
- AI-authored docs; demo and landing pages; reliable import/export with tests; high-contrast default theme.
- Interop: Guitar Pro, MIDI, Reaper; optional guitar sound playback; hardened worksheet data and validation.

## Non-goals

- Multi-user collaboration.
- Realtime sync across devices.
- Full music theory engine beyond basic interval/key.

## API (quick reference)

- `GET /api/projects/last` — Last opened project.
- `POST /api/projects` — Create project.
- `PATCH /api/projects/:id` — Update project.
- `GET /api/library?query=...` — Library search.

## Conventions (from PRD)

- Use shared types from `packages/shared` at API boundaries.
- Keep UI state normalized; diagrams are top-level, notes are children.
- Use tiling helper for new diagram placement; persist with debounce; update localStorage immediately.
- Excalidraw-inspired toolbar; canvas-first; minimal chrome.

For detailed functional requirements, security, data model, UX guidelines, known issues, and tech debt, see **PRD.json**.
