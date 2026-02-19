# PRD: Add Three Rusty Cooley PDFs as Worksheets

**Audience:** Perpetual coding agent implementing worksheet content for Neck Diagram Studio  
**Depends on:** Worksheet feature as specified in `.ai/prompts/WORKSHEET_FROM_PDF_AND_CANVAS.md`  
**Date:** 2026-02-19

---

## 1. Objective

Add three existing PDFs as **bundled or seed worksheets** in the website’s Worksheets section so users can load them as the current worksheet and render diagrams to the canvas. The agent must derive correct, verified Worksheet JSON from each PDF, fix typos and notation errors, and integrate the worksheets into the app (e.g. predefined list or loadable JSON assets).

---

## 2. Source PDFs

| # | Filename | Path (reference) | Description |
|---|----------|------------------|-------------|
| 1 | `shape sharing (3).pdf` | `.../05 Miscellaneous/shape sharing (3).pdf` | 12 six-string mode/scale diagrams (5th and 6th string roots): G major, A Dorian, B Phrygian, C Lydian, D Mixolydian, E natural minor, F# Locrian; some duplicates with different fret markers. |
| 2 | `8 string major and minor sweep shapes.pdf` | `.../04 Images & Diagrams/8 string major and minor sweep shapes.pdf` | 6 eight-string arpeggio sweep diagrams + 1 blank “Header”: A minor and C major root/1st/2nd inversions. |
| 3 | `8 string root A harmonic Minor.pdf` | `.../04 Images & Diagrams/8 string root A harmonic Minor.pdf` | 8 eight-string diagrams: A Harmonic Minor (full + position), plus modes (G# Altered bb7, D Dorian #4, E Phrygian Dominant, B Locrian Natural 6, C Lydian #2, C Major #5). |

**Note:** The app does not parse PDFs. The agent must produce **Worksheet**-shaped JSON (see `WORKSHEET_FROM_PDF_AND_CANVAS.md`) from the content below and from the PDFs (e.g. by human extraction, OCR, or pre-made JSON). PDF paths above are for source reference only.

---

## 3. Content Summary and Errors to Correct

### 3.1 PDF 1: Shape sharing (3).pdf

- **Layout:** 12 diagrams in two columns; 6-string; Roman numeral fret markers.
- **Diagrams (left column):** 5th string root G major; 5th string root A dorian minor; B Phyrgian minor; C Lydian major; D Mixolydian; E natural minor; F# locrian minor.
- **Diagrams (right column):** 6th string root D mixolydiar; 6th string root E natural minor; F#locrian minor; G major; A Dorian minor; B phrygian minor; Clydian major.

**Typos and corrections (apply in worksheet item `name` and any labels):**

| As in PDF | Correct |
|-----------|---------|
| Phyrgian | Phrygian |
| mixolydiar | Mixolydian |
| Clydian | C Lydian |
| F#locrian (no space) | F# Locrian |

**Redundancy (optional normalization):** Mode names often include “minor” or “major” (e.g. “A dorian minor”, “C Lydian major”, “F# locrian minor”). Prefer standard names: “A Dorian”, “C Lydian”, “F# Locrian”, “E Natural Minor”, “B Phrygian” (mode implies quality).

**Notation / structural issues:**

- **Fret markers:** Roman numerals are inconsistent (absolute vs relative). F# Locrian (left column) shows markers IX, XII but root F# 6th string is at fret 2 (range ~0–5) — markers are wrong; use a consistent interpretation (e.g. absolute fret numbers for the visible range) or omit/derive from root.
- **Duplicates:** Same pattern appears twice with different markers (e.g. E natural minor left/right, B Phrygian left/right, F# Locrian left/right). Either treat as one diagram per unique pattern (with one correct fret range) or keep both with distinct names (e.g. “5th string root …” vs “6th string root …”) and consistent fret ranges.
- **Unusual ‘o’ symbol:** Some diagrams have a small ‘o’ above a fretted note (e.g. 6th string root E natural minor, G major). Interpret as open-string only if it is on an open string; otherwise treat as a note or omit until clarified.

**Worksheet output:** One worksheet, e.g. title **“Shape sharing – Modes (6-string)”**, `sourceRef`: `"shape sharing (3).pdf"`. One item per diagram; each item must have correct key/scale/position and consistent naming (after corrections above). Default config: 6 strings; resolve key/scale/position from app library where possible.

---

### 3.2 PDF 2: 8 string major and minor sweep shapes.pdf

- **Title (use for worksheet):** “8 String Major and Minor Arpeggio Sweep Patterns”
- **Attribution:** Rusty Cooley Music
- **Layout:** 7 cells: 6 named arpeggio diagrams + 1 blank “Header”. All 8-string; fret range III–XXIV (Roman numerals).

**Diagram list (worksheet items):**

1. A Minor 2nd Inversion 51b3  
2. A Minor Root Inversion 1b35  
3. A Minor 1st Inversion b351  
4. C Major Root Inversion 135  
5. C Major 1st Inversion 351  
6. C Major 2nd Inversion 513  
7. Header (blank template — optional: include as “Header” item with no notes, or omit from worksheet)

**Verification / error:**

- **C Major 1st Inversion 351:** Red dots (root emphasis) in the diagram mark **G** (5th). Convention in other diagrams: red = first interval in the inversion label. For “351” the first interval is “3” (E). So either:
  - **Option A:** Treat as source error: red dots should be E; document and optionally generate notes for E if implementing note-level data.
  - **Option B:** Keep diagram as-is (red = G) and document the inconsistency in a comment or in the PRD so a human can correct later.

**Worksheet output:** One worksheet, title **“8 String Major and Minor Arpeggio Sweep Patterns”**, `sourceRef`: `"8 string major and minor sweep shapes.pdf"` or `"Rusty Cooley Music"`. Each item: `name` as above; `keyId` A or C; scale/arpeggio and position resolved from library (or fallback names). **Config:** 8 strings; ensure library or diagram config supports 8-string and desired tuning (e.g. F# B E A D G B E or document default).

---

### 3.3 PDF 3: 8 string root A harmonic Minor.pdf

- **Title (use for worksheet):** “8 String Root A Harmonic Minor and Modes”
- **Attribution:** Rusty Cooley Music 2026
- **Layout:** 8 diagrams: 1 full-neck A Harmonic Minor + 7 position diagrams. 8-string; interval labels in circles (R, b2, 2, b3, 3, 4, b5, 5, b6, 6, b7, 7, etc.).

**Diagram list (worksheet items):**

1. A Harmonic Minor (full fretboard, frets I–XXIV)  
2. G# Altered bb7 (position)  
3. D Dorian #4 (position)  
4. A Harmonic Minor (position, e.g. III–IX)  
5. E Phrygian Dominant (position)  
6. B Locrian Natural 6 (position)  
7. C Lydian #2 (position)  
8. C Major #5 (position)

**Verification and naming:**

- **Non-standard names:** These are valid exotic/jazz modes or custom names. Keep as-is for display; map to library scale/mode IDs where possible (e.g. Harmonic Minor, Phrygian Dominant). If a scale does not exist in the library, document it and either add a library entry or use a fallback (e.g. “Custom” or scale name string).
- **Altered bb7 / Dorian #4 / Locrian Natural 6 / Lydian #2 / Major #5:** Verify interval sets against a theory source or leave as creator-defined; document any ambiguity.
- **Tuning:** 8-string tuning not stated; assume app default (e.g. F# B E A D G B E) unless specified elsewhere. Document in worksheet or in app config.
- **Duplicate “A Harmonic Minor”:** Two items (full neck + one position); keep both with distinct `name` (e.g. “A Harmonic Minor (full)” and “A Harmonic Minor (position III–IX)”).

**Worksheet output:** One worksheet, title **“8 String Root A Harmonic Minor and Modes”**, `sourceRef`: `"8 string root A harmonic Minor.pdf"`. Each item: correct key/scale/mode and position; 8-string config; interval/note data if implementing `notes` array.

---

## 4. Data Model and Library Resolution

- Use the **Worksheet** and **WorksheetItem** schema from `WORKSHEET_FROM_PDF_AND_CANVAS.md`:
  - `id`, `title`, `sourceRef?`, `items[]`
  - Each item: `name`, `keyId?`, `scaleId?`, `positionId?`, `notes?`, and any `config` overrides (e.g. string count, fret range).
- **keyId / scaleId / positionId:** Resolve against the app’s library (`GET /api/library` or in-memory `keyOptions`, `scaleOptions`, `positionOptions`). If an ID is missing:
  - Option A: Skip that item and report (e.g. in console or UI).
  - Option B: Create the diagram without that theory (same as when a library item is deleted). Document the chosen behavior in code or docs.
- **8-string worksheets (PDF 2 and 3):** Set diagram config to 8 strings (and default tuning if applicable) so “Render diagrams on canvas” produces correct necks.

---

## 5. Deliverables for the Agent

1. **Three Worksheet JSON files** (or one JSON file with an array of three worksheets):
   - Derived from PDF 1, 2, 3 with corrections applied (typos, redundant “minor”/“major”, consistent naming).
   - Stored under the repo (e.g. `apps/web/public/worksheets/` or `packages/shared/data/worksheets/`) with stable filenames:
     - `shape-sharing-modes-6string.json`
     - `8string-major-minor-sweep-arpeggios.json`
     - `8string-root-A-harmonic-minor-modes.json`
2. **Integration in the Worksheets panel:**
   - Either: “Load from file” plus docs linking these JSON URLs/paths so users can load them,  
   - Or: A predefined list of bundled worksheets (e.g. dropdown or list) that loads one of these three when selected.
3. **Documentation:**
   - Short doc (e.g. in `/docs` or `.ai/`) listing the three worksheets, their source PDFs, and the corrections applied (typos, C Major 1st Inversion red-dot note, fret-marker conventions).
   - Document library resolution behavior (skip vs create without theory) and 8-string default.

---

## 6. Acceptance Criteria

- [x] Three Worksheet JSON files exist in the repo and conform to the Worksheet/WorksheetItem schema (`apps/web/public/worksheets/`).
- [x] All typos from Section 3.1 are corrected in worksheet item names (Phyrgian → Phrygian, mixolydiar → Mixolydian, Clydian → C Lydian, F#locrian → F# Locrian).
- [x] PDF 1 worksheet: 12+ items; 6-string; key/scale/position resolved where possible.
- [x] PDF 2 worksheet: 6 items; 8-string; A minor and C major inversions; C Major 1st Inversion 351 inconsistency documented in PRD (Option B: keep as-is).
- [x] PDF 3 worksheet: 8 items; 8-string; A Harmonic Minor + modes; non-standard scale names preserved and mapped to library where possible.
- [x] User can load each of the three worksheets (via bundled buttons or file upload) and see title + item list in the Worksheets panel.
- [x] “Render diagrams on canvas” creates one diagram per worksheet item on the active tab, with correct key/scale/position and tiling; 8-string worksheets render with 8 strings.
- [x] Source PDF paths and correction decisions are documented in this PRD (Section 3).

---

## 7. Optional Extensions

- Add `notes` arrays per item (fret/string/interval) for exact replication of dot positions from the PDFs.
- Add more PDFs as worksheets using the same process (extract → verify → correct → JSON → integrate).
- Backend or project-scoped storage for user-added worksheets; bundled worksheets remain loadable as default options.

---

## 8. Implementation Notes (done)

- **Bundled worksheets:** `apps/web/public/worksheets/shape-sharing-modes-6string.json`, `8string-major-minor-sweep-arpeggios.json`, `8string-root-A-harmonic-minor-modes.json`. Loaded via “Bundled worksheets” buttons in the Worksheets panel.
- **Storage:** Current worksheet is persisted in `localStorage` under `neck-diagram:worksheets` so it survives refresh.
- **Library resolution:** When a worksheet item’s `keyId`/`scaleId`/`positionId` is missing from the library, the diagram is still created with that id; notes are built only when the library has the scale intervals (Option B: create diagram without theory if needed).
- **Types:** `Worksheet` and `WorksheetItem` are in `packages/shared/src/types.ts`.

## 9. Reference

- Worksheet feature spec: `.ai/prompts/WORKSHEET_FROM_PDF_AND_CANVAS.md`
- App PRD: `.ai/PRD.json`
- Source PDFs: paths in Section 2 (user’s Nextcloud paths; agent may use copies in repo or relative paths for doc only).
