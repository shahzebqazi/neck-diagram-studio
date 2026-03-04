# UX and Accessibility Implementation Plan

Based on `.ai/PRD.json` **ux_guidelines**, **ux_ui_design_review** (including **prioritized_actions**), with file/component suggestions from the codebase. No code is modified by this document.

---

## 1. High-priority list (with file/change type)

| # | PRD wording | Likely file/component | Type of change |
|---|-------------|------------------------|----------------|
| 1 | Define .cta-button and variants so Docs CTAs are styled consistently. | `apps/web/src/styles.css`; referenced by `apps/web/src/pages/Docs.tsx` | CSS class: add `.cta-button`, `.cta-button.primary`, `.cta-button.ghost` (or align with existing `.lp-btn`/`.lp-cta` from Landing). |
| 2 | Handle status === 'error' with a dedicated message and Start blank / Retry. | `apps/web/src/App.tsx` (boot flow, early return, status state) | Copy + focus management: add error branch before loading/ready; render message + "Start blank project" and "Retry" buttons; set `status` to `'error'` when remote and local fallback both fail. |
| 3 | Delete modal: focus trap, focus Cancel on open, restore focus on close, aria-labelledby on dialog. | `apps/web/src/App.tsx` (delete modal: `deletePrompt`, `modal-backdrop`, `modal-card`, Cancel/Delete buttons) | ARIA + focus management: add `aria-labelledby` (and optional `aria-describedby`) on the dialog div pointing at the h4; trap focus inside modal; on open focus Cancel (first non-destructive); on close restore focus to the trigger that opened it. |

---

## 2. Medium-priority list (with file/change type)

| # | PRD wording | Likely file/component | Type of change |
|---|-------------|------------------------|----------------|
| 1 | Add Skip to main content and a Docs/Help link in the app header. | **Skip link:** `apps/web/src/App.tsx` (top of `.app`, before header). **Target:** same file — add `id="main-content"` (or similar) to `<main className="canvas">`. **Docs/Help link:** `apps/web/src/App.tsx` — header (`.app-header` / `.title-group` area). | Link + ARIA: add visually-hidden or off-screen `<a href="#main-content">Skip to main content</a>`; add Docs/Help `<Link to="/docs">` (or "Help") in header. |
| 2 | Title input placeholder when empty; zoom buttons aria-label. | **Placeholder:** `apps/web/src/App.tsx` — title `<input className="title-input">`. **Zoom:** same file — toolbar zoom buttons (minus, percentage, plus). | Copy + ARIA: `placeholder="Untitled project"` (or similar); `aria-label="Zoom out"`, `aria-label="Reset zoom"`, `aria-label="Zoom in"` on the three zoom buttons. |
| 3 | Empty-state copy: 'Use Add Neck to add your first diagram.' | `apps/web/src/App.tsx` — `statusMessage` useMemo (currently "Click + to add your first neck." for empty project). | Copy: change the empty-project branch to the PRD wording; optionally keep one line about tabs/drag if desired. |

---

## 3. Implementation notes

- **Ordering**
  - **Error state before empty state:** Implement the `status === 'error'` UI and boot-path `setStatus('error')` before or alongside empty-state copy changes, so the app has a clear error path and doesn’t only show generic empty messaging when both remote and local fail.
  - **Delete modal:** Add `aria-labelledby` and focus behavior (trap, focus Cancel on open, restore on close) together so the modal is both labeled and keyboard-safe in one pass.

- **Shared components / classes**
  - **`.cta-button`:** Define in `styles.css` and use in Docs (and optionally elsewhere). Align with Landing’s `.lp-btn` / `.lp-cta` for visual consistency, or reuse those classes in Docs if the design should match the landing page.
  - **Skip link:** Style so it’s visible on focus (e.g. same pattern as common “skip to main” implementations); ensure the target `id` is on the main canvas container so focus lands on the primary workspace.

- **Dependencies**
  - Error state: requires boot flow in `App.tsx` to set `status` to `'error'` when appropriate (e.g. when remote load fails and local cache is missing or invalid). Frontend TypeScript review and PRD both call this out.
  - Delete modal: store a ref to the element that opened the modal (e.g. the delete trigger) so focus can be restored on cancel/confirm.

- **Testing**
  - After changes: verify tab order in delete modal (Cancel before Delete; trap keeps focus inside until close); verify Skip link moves focus to main content; verify error view shows and “Start blank” / “Retry” work; verify Docs CTAs match intended style.

---

*Source: `.ai/PRD.json` — ux_guidelines, ux_ui_design_review (strengths, consistency_and_polish, accessibility, information_hierarchy_and_empty_states, navigation_and_wayfinding, header_and_title, toolbar_and_actions, sidebar_and_panels, canvas_and_diagrams, modals_and_destructive_actions, responsive_and_layout, small_polish, prioritized_actions).*
