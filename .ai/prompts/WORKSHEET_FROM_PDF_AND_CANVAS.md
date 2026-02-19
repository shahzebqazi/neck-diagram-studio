# AI Agent Prompt: 1:1 Worksheet from PDF + Render to Canvas

Use this prompt with an AI agent that has access to the Neck Diagram Studio repo. The agent will implement a **Worksheet** feature: create a worksheet that corresponds 1:1 to information from a PDF, and add a button that renders the worksheet’s diagrams onto the canvas.

---

## Objective

1. **Worksheet** – A single worksheet is a 1:1 list of diagram definitions. Each item in the list corresponds to one diagram (e.g. one scale/position from a PDF page or exercise list).
2. **Source of truth** – The worksheet is built from *information* that comes from a PDF (e.g. an AI or user has already extracted from the PDF: scale names, keys, positions). The app does not need to parse raw PDFs; it accepts **structured input** that represents that PDF-derived data.
3. **Render to canvas** – A single action (button) creates one diagram per worksheet item on the **current tab**, using the same layout/tiling as “Create Diagram” from Theory, and adds them to the project.

---

## Data Model

- **Worksheet**  
  - `id: string`  
  - `title: string` (e.g. "Chapter 3 – Minor Pentatonic")  
  - `sourceRef?: string` (optional, e.g. "PDF p.12" or filename)  
  - `items: WorksheetItem[]`  

- **WorksheetItem** (one row = one diagram)  
  - `name: string` (diagram label, e.g. "A minor pentatonic position 1")  
  - `keyId?: string` (library key id; optional if not used)  
  - `scaleId?: string` (library scale id)  
  - `positionId?: string` (library position id)  
  - `notes?: Note[]` (optional pre-filled notes; same shape as `Note` in `@shared/types`)  
  - Any other fields needed to call `createNeckDiagram` (e.g. `config` overrides) can be added later; start minimal.

- **Storage**  
  - Store worksheets in app state (and optionally in `localStorage` under a key like `neck-diagram:worksheets`) so they persist across refresh.  
  - No backend required for the first version; keep it client-only.

---

## User Flow

1. **Create worksheet from PDF-derived data**  
   - In the **Worksheets** panel, provide a way to define a new worksheet:  
     - **Paste JSON**: user (or an AI) pastes a JSON object that matches the Worksheet shape (title + items array).  
     - **Or** “Load from file”: user uploads a `.json` file that represents the same structure (e.g. exported from an AI that read the PDF).  
   - Validate the JSON; if invalid, show a short error and do not replace the current worksheet.  
   - On success, set this as the “current worksheet” (or append to a list and allow selecting one as current).

2. **View / edit current worksheet**  
   - Show the worksheet title and the list of items (at least: name, and key/scale/position if present).  
   - Optional: allow removing items or reordering; not required for the first version.

3. **Render diagrams on canvas**  
   - A single button: **“Render diagrams on canvas”** (or “Add to canvas”).  
   - Behavior:  
     - For the **current worksheet**, for **each** `WorksheetItem`:  
       - Resolve `keyId` / `scaleId` / `positionId` against the existing library (same as Theory panel: `keyOptions`, `scaleOptions`, `positionOptions`, `libraryIndex`).  
       - Compute position using the same tiling as `handleAddDiagramFromTheory`: `suggestTile` (or equivalent) so diagrams don’t overlap.  
       - Create a diagram with `createNeckDiagram({ name, keyId, scaleId, positionId, tabId: activeTabId, x, y, config..., notes: item.notes ?? [] })` and add it to `project.data.diagrams`.  
     - Use the **active tab** (`activeTabId`); if none, create or select a tab as the code already does when adding a diagram.  
     - After adding all diagrams, update project state (and persist if using API/localStorage).  
   - If the worksheet has no items, show a short message (“Add at least one item to the worksheet”) and do nothing.

---

## Implementation Notes for the Agent

- **Reuse existing logic**  
  - Diagram creation: use `createNeckDiagram` from `@/state/defaults` (or equivalent path).  
  - Tiling: use `suggestTile` and the same size/defaults as in `handleAddDiagramFromTheory` (e.g. `DEFAULT_DIAGRAM_SIZE`, `getDiagramExportHeight`, `TILE_GAP`).  
  - Library resolution: use existing `libraryIndex`, `keyOptions`, `scaleOptions`, `positionOptions`; resolve `keyId`/`scaleId`/`positionId` so that scale/position presets (e.g. frets) are applied like in Theory.  
  - Project update: use the same `updateProjectData` (or equivalent) pattern as when adding a single diagram.

- **Worksheets panel**  
  - The **Worksheets** section already exists above Theory; it currently has placeholder content.  
  - Add inside that panel:  
    - Input for “Paste worksheet JSON” (textarea) and/or “Load JSON file” (file input).  
    - “Set as current worksheet” (or “Load”) to parse and set the current worksheet.  
    - Display of current worksheet: title + list of item names (and optionally key/scale/position).  
    - Button: **“Render diagrams on canvas”** that performs the loop above.

- **1:1 meaning**  
  - One worksheet = one coherent set of diagram definitions (e.g. one PDF page or one exercise list).  
  - One worksheet item = one diagram on the canvas.  
  - No need to support multiple worksheets in the UI at first; one “current worksheet” is enough. Optionally allow a list of worksheets and a selector later.

- **PDF note**  
  - The app does not parse PDFs. The assumption is: the user (or an external AI/tool) has already turned the PDF into a JSON structure. The prompt enables the agent to implement the app side: accept that structure and render it 1:1 as diagrams on the canvas.

---

## Acceptance Criteria

- [ ] User can paste JSON (Worksheet shape) into the Worksheets panel and set it as the current worksheet.  
- [ ] User can optionally load a `.json` file with the same shape and set it as the current worksheet.  
- [ ] Invalid JSON shows an error message and does not overwrite the current worksheet.  
- [ ] Current worksheet is visible (title + list of items).  
- [ ] “Render diagrams on canvas” creates one diagram per worksheet item on the active tab, with correct key/scale/position and tiling.  
- [ ] Diagrams appear on the canvas and are part of the project (persist with the project).  
- [ ] If worksheet has no items, the button does nothing and user sees a clear message.

---

## Example JSON (PDF-derived)

```json
{
  "title": "A Minor Pentatonic – Positions 1–5",
  "sourceRef": "Method p.12",
  "items": [
    { "name": "A minor pentatonic position 1", "keyId": "<uuid-A>", "scaleId": "<uuid-pentatonic-minor>", "positionId": "<uuid-pos1>" },
    { "name": "A minor pentatonic position 2", "keyId": "<uuid-A>", "scaleId": "<uuid-pentatonic-minor>", "positionId": "<uuid-pos2>" }
  ]
}
```

The agent should accept `keyId`/`scaleId`/`positionId` as IDs that exist in the app’s library (from `GET /api/library` or in-memory options). If an ID is missing from the library, the agent may either skip that item and report it or create the diagram without that theory (same as when a library item is deleted); document the chosen behavior.

---

## Optional Extensions (not required for first version)

- Multiple worksheets and a dropdown to choose which one is “current”.  
- Export current worksheet as JSON.  
- Optional `notes` per worksheet item to pre-fill note positions on the diagram.  
- Backend storage for worksheets (e.g. per project or per user) once an API exists.
