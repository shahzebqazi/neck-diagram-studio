# Neck Diagram Studio User Guide

Last updated: February 6, 2026

## Overview
Neck Diagram Studio is a browser-based workspace for building guitar neck diagrams, laying them out on printable pages, and exporting clean assets for practice, lessons, or reference. The app is built around a simple model:

- A **project** contains one or more **tabs** (pages).
- Each tab contains one or more **diagrams**.
- Diagrams hold **notes** labeled by key, interval, or picking direction.

This guide documents the current web app behavior and avoids implying features that are not yet implemented.

## Quick start
1. Open the studio at `/app` (or explore the demo at `/demo`).
2. Click `Add Neck` to place a new diagram on the canvas.
3. Choose a key, scale/mode, and position in the **Theory** panel.
4. Click on the fretboard to toggle notes.
5. Drag diagrams to arrange the page.
6. Export your work using `Export` in the toolbar.

## Core concepts
- **Project**: The overall file. It auto-saves when the API is available and falls back to local cache when offline.
- **Tab**: A page within the project. Use tabs for variations or separate handouts.
- **Diagram**: A single neck diagram that can be moved, resized, and exported.
- **Library**: Searchable keys, scales/modes, and positions from the theory library.
- **Label mode**: Determines whether notes show key names, intervals, or picking direction.

## Create and edit diagrams
- Use `Add Neck` to insert a blank diagram.
- Use `Create Diagram` in **Theory** to create a diagram from the currently selected key/scale/position.
- Use `Replace Diagram` to update the selected diagram while preserving its size and position.
- Double-click a diagram caption to rename it.
- Drag a diagram to move it. Hold `Alt` to resize, or `Alt` + `Shift` to scale proportionally.
- Drop a diagram on the **Trash** zone to delete it, or use `Delete` / `Backspace`.
- Drag a diagram onto a tab button to move it between tabs.

## Labels, notes, and theory
- Label modes: `Key`, `Interval`, `Picking`.
- In **Picking** mode, clicking a note cycles `D` → `U` → off.
- Setting a project-wide key/scale updates interval and scale highlighting.
- The **Theory** panel defines defaults used by new diagrams.

## Instrument settings
In the **Instrument** panel (for the selected diagram):
- Adjust string count and tuning.
- Use 8-string presets when strings = 8.
- Set fret count and capo position.

## Appearance and layout
In **Settings** (for the selected diagram):
- Toggle standard tuning display vs. custom tuning.
- Show fret numbers in Arabic or Roman numerals.
- Toggle inlays.
- Snap-to-grid for tidy layouts.

Project-level preferences:
- Theme selection (Appearance).
- Delete warning and page date visibility (Preferences).

## Import and export
Export options:
- **Diagram PNG**: A high-resolution image of the selected diagram.
- **Diagram JSON**: The selected diagram’s data for reuse.
- **Page PDF/PNG**: The current tab as a printable page.
- **Page JSON**: The current tab and diagrams for backup or transfer.

Import options:
- **Diagram JSON** adds diagrams into the active tab.
- **Page JSON** merges tabs and diagrams into the project.
- Invalid JSON is rejected with an error and does not mutate state.

## Auto-save and recovery
- When the API is reachable, projects auto-save to the server.
- The latest project is cached locally for offline recovery.
- Demo mode resets on refresh and does not persist changes.

## Keyboard and pointer shortcuts
- `Escape`: Clear selection.
- `Delete` / `Backspace`: Delete selected diagram or tab.
- `Cmd/Ctrl + /`: Toggle the sidebar.
- `Alt` + drag: Resize diagram.
- `Alt` + `Shift` + drag: Scale diagram proportionally.

## Troubleshooting
- **Export buttons are disabled**: Select a diagram (for diagram export) or add at least one diagram (for page export).
- **Changes don’t persist**: The app may be offline. Work is still cached locally and should load on refresh.
- **Notes won’t toggle**: Ensure the diagram is selected and you are clicking the fretboard surface.

## FAQ
**Does the demo save my work?**  
No. Demo edits reset on refresh.

**Can I import/export single diagrams?**  
Yes. Use Diagram JSON for import/export of a single diagram.

**What file formats are supported?**  
PNG, PDF, and JSON.
