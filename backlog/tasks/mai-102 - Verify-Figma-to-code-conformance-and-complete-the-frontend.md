---
id: MAI-102
title: Verify Figma-to-code conformance and complete the frontend
status: In Progress
assignee:
  - '@chatgpt'
created_date: '2026-07-28 03:08'
updated_date: '2026-07-30 05:24'
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
modified_files:
  - gui/screens/ScreenBody.tsx
  - gui/screens/ScreenBody.module.css
  - gui/screens/ScreenBody.stories.tsx
  - gui/screens/ScreenBody.test.ts
  - gui/conformance/mai102-authority-matrix.json
  - gui/scripts/verify-frontend-conformance.mjs
  - gui/scripts/verify-frontend-workflows.mjs
  - gui/package.json
  - scripts/verify.ts
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
- [x] #1 Visual comparison evidence covers all 25 screen families at every approved breakpoint and interaction state.
- [x] #2 Prototype-derived end-to-end tests cover the principal banker, administrator, and external-participant workflows.
- [x] #3 Accessibility verification covers keyboard navigation, focus, semantics, contrast, reduced motion, validation, and assistive-technology behavior.
- [x] #4 Route, state, permission, destructive-action, and responsive coverage is complete.
- [x] #5 No Stitch artifact or legacy GUI convention remains an active design authority.
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
2026-07-30 intake: MAI-101 is Done on master at 75dbeefffa9b074366af96c7092ff9d40df9b8aa. Branch feat/MAI-102-frontend-conformance was created from that commit. Local static checks passed for generated tokens, token contracts and contrast, approved components, shell boundary, MAI-99 screens, MAI-100 deal screens, and MAI-101 execution screens.

The bounded audit identified one product P1 class: the eleven MAI-99 global, administration, and external bodies still used a generic sparse two-card composition, and their direct Storybook fixture omitted implementationStatus, producing blank critical-state evidence. ScreenBody now uses approved operational registry/inspector structures, responsive governed layout, explicit fixture disclosure, and permission-safe administration/external boundaries. The Storybook fixture and semantic tests were corrected. A separate checkbox target-size report was classified as an instrumentation false positive and corrected by measuring its visible label target.

Permanent verification now includes a 25-family Figma authority matrix, frontend conformance verifier, and four browser-driven principal workflows: banker task to exact decision context, banker portfolio to deal decision room, governed administrator settings, and purpose-bound external participation.

Final rendered proof: run 30515406331, job 90783986520, artifact 8748735375, digest sha256:7408f6a2cb86f49f8222a5c42e168bacfc0efa3b5c2dce7b768775b2187755ee. Repository-pinned Playwright 1.61.1 and Chromium 149.0.7827.55 captured 25 unique families at desktop, tablet, and mobile: 75/75 matrix cases plus 17/17 critical states, zero failures, zero open P0/P1. Product, responsive, permission, destructive-action, and accessibility evidence was visually inspected.

Exact-head canonical workflow proof: candidate 3f9315f89a99c05158913295da36c8af183d8ea2, tree 623638f233e34ad147670dd674a01982ac29ad33, run 30516186883, job 90786427680, artifact 8749017917, digest sha256:c515306cfe7fa9e9dc8b389948febd629119c72fb2abaae08016a3e98ecaad08. deno task verify completed with EXIT_STATUS=0, including Frontend Figma-to-code conformance, GUI unit tests, production build, four principal browser workflows, Storybook documentation/build, and Storybook interaction tests.

Accepted deviations: MAI-100 responsive compositions outside the Decision Room are implementation-owned governed runtime derivations rather than direct pixel baselines. MAI-101 tablet/mobile behavior and five non-Negotiation/non-Agentic families derive from the approved shared-pattern board rather than standalone pixel baselines. All unimplemented backend behavior remains explicitly fixture-backed and makes no production integration claim.

All temporary workflows, trigger markers, rendered-review runners, screenshots, reports, and browser artifacts were removed from the branch. Open P0/P1 count is zero. Acceptance criterion #6 remains open only for the single owner approval and final closure decision.
<!-- SECTION:NOTES:END -->
