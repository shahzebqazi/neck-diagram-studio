# Conventions — Neck Diagram Studio

Use when implementing features in the codebase. Kept short for focused context (Anthropic/OpenAI-friendly).

## Code and architecture

- **Shared types:** Use types from `packages/shared` when crossing API boundaries. Do not duplicate or redefine in apps.
- **State:** Keep UI state normalized. Diagrams are top-level entities; notes are children. Do not nest diagrams inside other diagrams.
- **Placement:** Use the tiling helper (`suggestTile` / `apps/web/src/lib/tiling.ts`) for suggested placement of new diagrams.
- **Persistence:** Persist on change with debounce. Always update localStorage immediately when project data changes.

## UI/UX (from PRD)

- **Style:** Excalidraw-inspired top toolbar. Canvas first; minimal chrome.
- **Diagrams:** Clear selection state and resize feedback. Collapsed sidebar keeps page outline centered with consistent padding.
- **Responsive:** In narrow viewports (≤960px) the sidebar overlays the canvas with correct z-index and width.
- **Demo/landing:** Demo page fully interactive but clearly marked; landing page concise, clear, link-focused.

## Agent coordination (when multiple agents work on repo)

- **Ownership:** Prefer not modifying files owned by another agent. See PRD.json `parallel_agent_coordination.file_ownership`.
- **Changes:** Prefer small, isolated changes. For large or architectural changes, propose first.
- **Branches:** Use branch prefix `codex/` when creating feature branches from agents.

## Quality

- Prefer additive changes; minimize large refactors without agreement.
- Avoid re-registering drag/listener handlers on every pointer move; decouple from frequently-updated state where possible.
