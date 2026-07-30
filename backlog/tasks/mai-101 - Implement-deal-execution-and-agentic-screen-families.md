---
id: MAI-101
title: Implement deal execution and agentic screen families
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-28 03:08'
updated_date: '2026-07-30 01:50'
labels:
  - frontend
  - screen-implementation
  - deal-execution
  - agentic-ui
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-100
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
modified_files:
  - gui/lib/shell/route-registry.ts
  - gui/lib/shell/route-registry.test.ts
  - gui/app/_shell/AppShell.tsx
  - gui/app/_shell/AppShell.test.ts
  - gui/screens/deal-execution/contracts.ts
  - gui/screens/deal-execution/fixtures.ts
  - gui/screens/deal-execution/DealExecutionBody.tsx
  - gui/screens/deal-execution/DealExecutionBody.module.css
  - gui/screens/deal-execution/DealExecutionBody.test.ts
  - gui/screens/deal-execution/DealExecutionBody.stories.tsx
  - gui/scripts/verify-execution-screens.mjs
  - gui/package.json
  - scripts/verify.ts
priority: high
ordinal: 1400
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 13 of the MAI-85 initiative.

Implement these approved Figma screen families:

- Negotiation Room
- Closing Control Room
- Agentic Workspace
- Deal Activity & Audit
- Deal Team & Access
- Deliverables & Exports
- Deal Settings & Archive

Use typed local fixtures and adapters where backend behavior has not yet been redesigned.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All seven listed screen families are implemented against their approved Figma frames and governed definitions.
- [ ] #2 Human approval, permission, escalation, audit, destructive-action, and irreversible-transition boundaries match the approved experience.
- [ ] #3 Agentic states truthfully distinguish proposed, running, blocked, failed, and completed work and expose required evidence, citations, and tool activity.
- [ ] #4 Shared deal context and workflow transitions remain consistent across the seven families.
- [ ] #5 Unapproved backend behavior is isolated behind typed local fixtures and adapters without false production claims.
- [ ] #6 Each screen family has focused component, interaction, route, state, and accessibility tests.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preserve MAI-98 shell and MAI-99/100 body ownership while adding an explicit seven-route MAI-101 resolver with no fallback.
2. Add typed local execution contracts and one deterministic cross-screen fixture graph; implement seven execution families in three waves using existing tokens and components.
3. Add bounded stories, focused interaction/accessibility tests, and verify:execution-screens; record Figma traceability and governed-board derivations.
4. Run focused checks and one bounded local rendered review, correct P0/P1 findings, then run the requested final verification once.
5. Commit cohesive changes, push feat/MAI-101-deal-execution-agentic-screens, open one Draft PR, keep MAI-101 In Progress, and request owner review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Intake 2026-07-29: MAI-100 squash merge 76aefd49708abddfa4bb924d1da403a826029b30 is present on master. Baseline deno task verify was run once; it reached GUI verification but sandbox spawnSync git EPERM prevented a terminal pass. One-time npm ci completed; Playwright Chromium installation was requested in the same setup command. Figma get_design_context was read for 239:3, 239:551, and 239:921 without mutating Figma. Local graph query scoped AppShell, route registry, existing deal-intelligence body, Dialog, and Drawer.

Implemented initial MAI-101 execution resolver, seven local fixture-backed bodies, contracts, stories, focused tests, and verify:execution-screens registration. Focused evidence: npm --prefix gui run verify:execution-screens PASS; npm --prefix gui run test:unit PASS (85 tests); npm --prefix gui run lint PASS; npm --prefix gui run build PASS. Full final verification, local rendered review, Storybook checks, commit/push, and Draft PR remain outstanding. Baseline deno task verify remains blocked at foundation verification by sandbox spawnSync git EPERM, not treated as passing.
<!-- SECTION:NOTES:END -->
