# Neck Diagram Studio

Web editor for guitar and bass fretboard diagrams: scales, chords, and note layouts.

**Repo:** [gitlab.com/destroyerofworlds/neck-diagram-studio](https://gitlab.com/destroyerofworlds/neck-diagram-studio)

## Status

Frontend only in this tree (Next.js). Login/register pages and the API client expect a backend that is not checked in. `docker-compose.yml` describes a planned stack (PostgreSQL, Haskell API, nginx) and will not run as-is.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## What works in the frontend

- Pan and zoom; place multiple neck diagrams on one page
- 4–8 strings, fret range, capo position
- Intervals (R, b3, 5), note names, picking marks (↓, ↑)
- Scale and tuning presets (guitar and bass)
- Export to PNG or PDF from the UI

## Stack

Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand.

## Layout

```
frontend/     Next.js app
tests/        SQL fixtures (for a future backend)
skills/       Optional agent workflow notes
```

## Canvas shortcuts

| Action | Input |
|--------|--------|
| Pan | Space + drag, or middle mouse |
| Zoom | Scroll wheel |
| Select | Click diagram |
| Multi-select | Shift + click |
| Move | Drag selection |
| Duplicate | Alt + drag |
| Resize | Alt + Shift + drag |
| Add note | Click fret |
| Remove note | Click note |

## License

MIT
