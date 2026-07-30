---
id: MAI-102
title: Verify Figma-to-code conformance and complete the frontend
status: In Progress
assignee:
  - '@chatgpt'
created_date: '2026-07-28 03:08'
updated_date: '2026-07-30 04:05'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Build the exact 25-family authority matrix from approved MAI-91, MAI-92, MAI-93, and MAI-94 evidence without treating deferred responsive drafts as pixel baselines.
2. Run one bounded rendered audit across every approved breakpoint plus implementation-owned responsive coverage and existing critical states.
3. Add only missing workflow, accessibility, route, state, permission, destructive-action, responsive, and legacy-authority verification; correct only genuine P0/P1 findings.
4. Run the complete canonical frontend gate once on the final tree, retain durable evidence, remove temporary review infrastructure, and request one owner review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-07-30 intake: MAI-101 is Done on master at 75dbeefffa9b074366af96c7092ff9d40df9b8aa. Branch feat/MAI-102-frontend-conformance created from that commit. Local static checks passed for generated tokens, token contracts and contrast, approved components, shell boundary, MAI-99 screens, MAI-100 deal screens, and MAI-101 execution screens. The local archive has no Git metadata, dependency cache, or Deno binary, so browser-backed and canonical execution is isolated to one clean remote proof environment. First bounded rendered manifest contains 65 authority/runtime viewport cases derived from approved scope and 17 existing critical-state stories; no product outcome is claimed until its retained report is inspected.
<!-- SECTION:NOTES:END -->
