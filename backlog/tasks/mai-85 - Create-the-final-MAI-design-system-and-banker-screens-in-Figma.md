---
id: MAI-85
title: Establish the Figma design system and rebuild the MAI banker workspace from it
status: Done
assignee: []
created_date: '2026-07-22 05:55'
updated_date: '2026-07-31 02:08'
labels:
  - design-system
  - figma
  - frontend
  - product
  - initiative
milestone: m-12
dependencies: []
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
MAI-85 is the initiative and sequence authority for rebuilding the MAI banker workspace.

Figma is the sole visual and interaction design authority for this initiative. The existing GUI, gui/DESIGN.md, Stitch artifacts, and the current MVP implementation may be inspected as historical evidence, but they are not compatibility constraints and must not drive the target experience.

The mandatory delivery order is:

1. Define and approve the Figma design system.
2. Complete and govern the 25 screen definitions under design/.
3. Design every screen family in Figma.
4. Prototype and approve the end-to-end workflows in Figma.
5. Establish a clean frontend foundation and rebuild from the approved Figma source.
6. Verify Figma-to-code conformance and complete the frontend.
7. Redesign the backend, domain, and APIs around the approved frontend workflow.

The design/ directory is working product-design input. It must be completed, reviewed, classified under documentation governance, and linked to the corresponding Figma frames before it is treated as implementation authority.

The ordered delivery chain is MAI-89 through MAI-103. Backend implementation work is intentionally outside this initiative's current task chain. It may be created with the next available global integer task IDs only after MAI-103 is approved.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The shared Figma source defines variables, typography, color, spacing, grids, elevation, iconography, motion, breakpoints, accessibility rules, and component anatomy, variants, states, responsiveness, and usage.
- [x] #2 All 25 banker-workspace design definitions are complete, reviewed, governed, and linked to their corresponding Figma frames.
- [x] #3 All screen families are approved at required responsive breakpoints and cover loading, empty, error, permission, destructive-action, and workflow-specific states.
- [x] #4 Interactive Figma prototypes validate the principal banker and external-participant journeys.
- [x] #5 The frontend is derived from the approved Figma source and is not required to preserve the existing GUI structure, styling, or component implementation.
- [x] #6 Stitch artifacts and superseded Stitch-first tasks no longer influence active design or implementation decisions.
- [x] #7 Figma-to-code conformance and frontend workflow verification are approved before backend redesign begins.
- [x] #8 The backend architecture, domain model, and contracts are redesigned from the approved frontend workflow rather than inherited from the current MVP API.
<!-- AC:END -->

















## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Strict delivery sequence

All tasks are unassigned until explicitly claimed. Do not start a task while its dependency is incomplete.

1. MAI-89 — Define and approve the MAI Figma design system
2. MAI-90 — Complete and govern the 25 banker-workspace design definitions
3. MAI-91 — Design global, administration, and external screen families in Figma
4. MAI-92 — Design deal intelligence and decision screen families in Figma
5. MAI-93 — Design deal execution and agentic screen families in Figma
6. MAI-94 — Prototype and approve end-to-end banker workflows in Figma
7. MAI-95 — Retire Stitch and legacy GUI visuals and establish a clean frontend foundation
8. MAI-96 — Implement Figma variables and tokens in the frontend
9. MAI-97 — Implement the Figma component library in code and Storybook
10. MAI-98 — Implement application shell, navigation, and route architecture
11. MAI-99 — Implement global, administration, and external screen families
12. MAI-100 — Implement deal intelligence and decision screen families
13. MAI-101 — Implement deal execution and agentic screen families
14. MAI-102 — Verify Figma-to-code conformance and complete the frontend
15. MAI-103 — Redesign MAI backend, domain, and APIs around the approved frontend workflow

## Backend implementation gate

Do not create or start backend implementation tasks for the redesigned workflow until MAI-103 is approved. At that point, create the approved backend plan using the next available global MAI-<integer> IDs.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Codex
created: 2026-07-28 02:55
---
Owner-approved rebaseline on 2026-07-27: MAI-85 now governs the Figma-first design, prototype, frontend rebuild, conformance, and backend-redesign sequence. Existing GUI, Stitch work, and current MVP contracts are historical evidence only.
---

author: Codex
created: 2026-07-28 03:01
---
Historical trace: MAI-48 is already a completed archived Stitch-first task, so Backlog's active-task editor cannot append a comment to it. Its plan is explicitly superseded by MAI-85 and must not be treated as active authority.
---

author: Codex
created: 2026-07-28 03:09
---
ID correction on 2026-07-28: decimal tasks MAI-85.1 through MAI-85.15 were created in error despite the repository's integer-only ID convention. The authoritative replacement chain is MAI-89 through MAI-103. The decimal tasks are superseded and will be archived.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 The design source and exported handoff package are accessible, versioned, and linked from the canonical Backlog documentation
- [x] #2 Accessibility and consistency reviews are completed with findings resolved or tracked
- [x] #3 The approved design covers every screen and state required by the Banker Workspace milestone
- [x] #4 Every replacement task from MAI-89 through MAI-103 is completed with linked evidence and the required sequence is preserved.
- [x] #5 Obsolete active Stitch-first, prototype-constrained, and mistakenly created decimal-ID tasks are archived with a trace to this initiative.
- [x] #6 The approved MAI-103 backend redesign records an independently deliverable backend implementation backlog for creation with the next available global integer task IDs.
<!-- DOD:END -->
