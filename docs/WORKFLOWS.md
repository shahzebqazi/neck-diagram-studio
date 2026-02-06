# Workflows

## Canvas interactions
- Click a diagram to select it.
- Click empty canvas or press `Escape` to clear selection.
- Drag to move a diagram.
- `Alt` + drag resizes; `Alt` + `Shift` scales proportionally.
- When the sidebar is collapsed, a page outline stays centered and aligned to the content.

## Diagram management
- Use `Add Neck` to create a diagram.
- Use `Create Diagram` in the Theory panel to create a diagram using current key/scale/position.
- Use `Replace Diagram` to update the selected diagram while preserving its size and position.

## Notes and labels
- Click on the fretboard to toggle notes.
- Label modes: key, interval, picking direction.
- Global key/scale selection affects interval and note labeling.

## Library search
- Search by key, scale, mode, or position.
- Results are loaded from the API and filtered by type.

## Import/export
Export:
- PNG and PDF exports capture the on‑screen layout.
- JSON export supports both a selected diagram and a full page.

Import:
- Diagram JSON imports add diagrams into the current tab.
- Page JSON imports merge tabs and diagrams.
- Invalid JSON shows a clear error and does not mutate state.

## Persistence
- Auto‑save persists projects to Postgres.
- Local cache keeps the latest project for offline recovery.
