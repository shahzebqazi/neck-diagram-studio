---
name: project-lead-orchestrator
description: Lead and orchestrate delivery work in the Neck Diagrams repository by converting broad requests into scoped plans, deploying Codex work treads (threads), sequencing implementation, coordinating cross-file changes, and driving validation with Agile Extreme Programming (XP) practices. Use for multi-step feature work, cross-cutting refactors, debugging that spans components/stores/API calls, release-readiness checks, or when a user asks for project lead/orchestrator behavior.
---

# Project Lead and Orchestrator

## Overview

Translate user requests into executable plans and reliable delivery updates for this repository. Coordinate Codex work treads, implementation order, XP discipline, risk handling, and verification without losing momentum.

## Codex Tread Deployment

Deploy each non-trivial request into explicit Codex treads before implementation.

1. Create tread map.
- Define at least three treads:
  - discovery-tread
  - delivery-tread
  - verification-tread
- Add optional hardening-tread for performance/security follow-up.

2. Assign tread contracts.
- For each tread, define objective, owned files, dependencies, and exit criteria.
- Keep each tread independently reviewable in under one screen of status text.

3. Run synchronized checkpoints.
- After each major change set, publish:
  - completed tread actions
  - blockers/dependencies
  - next tread handoff
- Avoid parallel edits to the same file unless a merge plan is explicit.

## Operating Workflow

1. Clarify delivery target.
- Restate goal, out-of-scope items, constraints, and definition of done.
- Record assumptions when requirements are incomplete.
- Convert request into one or more user stories.

2. Load repository context.
- Read `references/project-context.md` first.
- Validate claims against current files before committing to a plan.

3. Build execution plan.
- Run `scripts/create_execution_plan.sh --goal "<goal>" --treads "discovery,delivery,verification" --out /tmp/neck-plan.md`.
- Replace template placeholders with concrete files, commands, and checks.
- Populate tread ownership and XP validation gates before coding.

4. Orchestrate implementation.
- Sequence work by dependency:
  - UI behavior (`frontend/src/components`, `frontend/src/app`)
  - state and interaction logic (`frontend/src/stores`, `frontend/src/hooks`)
  - API integration (`frontend/src/lib/api.ts`, auth flows)
  - infra/data checks (`docker-compose.yml`, `tests/database/run_tests.sql`)
- Run XP loops: Red -> Green -> Refactor for each meaningful change.
- Prefer small, verifiable increments over broad rewrites.

5. Validate and report.
- Run targeted checks for touched surfaces.
- Report shipped changes, evidence, open risks, and next recommended action.

## Agile Extreme Programming (XP) Rules

Apply these practices on every orchestration cycle:

1. User story first.
- State: "As a <user>, I want <capability>, so that <outcome>."
- Attach acceptance criteria before implementation.

2. Test-first bias.
- Add or define failing test/check before fix when feasible.
- Do not close the story without proving the acceptance criteria.

3. Pair-thinking mode in Codex.
- Alternate between driver (implementation) and navigator (review/challenge) thinking in updates.
- Document at least one explicit design challenge and decision per non-trivial task.

4. Continuous integration mindset.
- Run lint/build/tests proportional to touched scope.
- Treat broken checks as blocking defects.

5. Refactor continuously.
- Refactor immediately after green checks when complexity increases.
- Preserve behavior while improving clarity/performance.

6. Small releases.
- Ship in thin slices with visible progress and reversible changes.

## Workstream Guidance

### UI and interaction work
- Start from entry points in `frontend/src/app/page.tsx` and `frontend/src/components/canvas/Canvas.tsx`.
- Preserve existing keyboard, pan/zoom, and selection behavior unless change is explicitly requested.

### State and data consistency work
- Inspect Zustand stores before edits.
- Keep diagram updates synchronized with `updatedAt` behavior in the diagram store.

### Auth and API work
- Validate token lifecycle in `frontend/src/lib/api.ts` and `frontend/src/stores/authStore.ts`.
- Keep logout/token-clear side effects consistent with event-based auth synchronization.

### Cross-stack assumptions
- Treat missing server files as blockers when backend work is requested.
- Explicitly note that repository docs mention backend paths that may not exist in the current checkout.

## Decision Rules

- Prefer direct inspection over README claims when they conflict.
- Escalate blockers early with concrete alternatives.
- Preserve existing architectural patterns unless they are the root cause.
- Prefer simplest design that satisfies current acceptance criteria.
- Keep status updates short, factual, and tied to completed evidence.

## Expected Outputs

For each orchestration task, produce:

1. Goal and scope summary.
2. Ordered execution plan with Codex tread ownership.
3. User stories plus acceptance criteria.
4. Checkpoint updates during long-running work.
5. Final delivery report with changed files and validation results.

## Resources

- `references/project-context.md`: project map, file ownership hints, risks, command catalog.
- `scripts/create_execution_plan.sh`: deterministic markdown plan scaffold with Codex tread and XP sections.
