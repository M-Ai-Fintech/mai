---
id: MAI-102
title: Verify Figma-to-code conformance and complete the frontend
status: To Do
assignee: []
created_date: '2026-07-28 03:08'
labels:
  - frontend
  - figma-conformance
  - verification
  - approval-gate
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-101
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
priority: high
ordinal: 1500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 14 of the MAI-85 initiative.

Perform the final frontend conformance, workflow, accessibility, and quality gate across all 25 banker-workspace screens before backend redesign begins.

Compare implementation with the approved Figma source at required breakpoints, execute the prototype-derived workflows end to end, and record any accepted deviations explicitly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Visual comparison evidence covers all 25 screen families at every approved breakpoint and interaction state.
- [ ] #2 Prototype-derived end-to-end tests cover the principal banker, administrator, and external-participant workflows.
- [ ] #3 Accessibility verification covers keyboard navigation, focus, semantics, contrast, reduced motion, validation, and assistive-technology behavior.
- [ ] #4 Route, state, permission, destructive-action, and responsive coverage is complete.
- [ ] #5 No Stitch artifact or legacy GUI convention remains an active design authority.
- [ ] #6 The complete frontend verification suite passes, and product, design, accessibility, and engineering approval is recorded with unresolved findings tracked.
<!-- AC:END -->
