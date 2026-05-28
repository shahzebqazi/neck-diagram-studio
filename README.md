<div align="center">

<p align="center">
  <img src="docs/assets/hero.svg" alt="Neck Diagram Studio" width="100%" />
</p>

# Neck Diagram Studio

### Fretboard editor for guitar and bass — scales, chords, tunings, export

[![Next.js](https://img.shields.io/badge/Next.js-14-000000.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](#license)

**Web app** for laying out multiple neck diagrams on a canvas: intervals, note names, picking marks, presets, PNG/PDF export.

> **Status:** Frontend shipped in this repo. Login/register UI and API client expect a **backend not checked in** — `docker-compose.yml` describes a planned PostgreSQL + Haskell API stack.

**Live:** [sqazi.sh/neck-diagram-studio](https://sqazi.sh/neck-diagram-studio/)

[Run locally](#run-locally) · [Features](#what-works) · [Stack](#stack) · [Shortcuts](#canvas-shortcuts)

</div>

---

## What works

| Feature | Detail |
|---------|--------|
| Canvas | Pan/zoom; multiple necks per page |
| Neck config | 4–8 strings, fret range, capo |
| Notation | Intervals (R, ♭3, 5), note names, picking ↓ ↑ |
| Presets | Scale and tuning presets (guitar + bass) |
| Export | PNG or PDF from the UI |

---

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000/neck-diagram-studio/

---

## Stack

| Layer | Technology |
|-------|------------|
| UI | Next.js 14, React 18, TypeScript, Tailwind CSS |
| State | Zustand |
| Planned API | Haskell service (not in tree) |

---

## Layout

```
frontend/     Next.js app (shipped)
tests/        SQL fixtures for future backend
skills/       Optional agent workflow notes
```

**Repos:** [GitHub](https://github.com/shahzebqazi/neck-diagram-studio) · [GitLab](https://gitlab.com/destroyerofworlds/neck-diagram-studio)

---

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
| Add / remove note | Click fret / click note |

---

## License

MIT
