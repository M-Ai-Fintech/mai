---
id: MAI-95
title: Retire Stitch and legacy GUI visuals and establish a clean frontend foundation
status: To Do
assignee: []
created_date: '2026-07-28 03:08'
updated_date: '2026-07-29 01:42'
labels:
  - frontend
  - foundation
  - stitch-retirement
  - gui-rebuild
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-94
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
priority: high
ordinal: 800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 7 of the MAI-85 initiative.

Establish the frontend foundation that will implement the approved Figma source without preserving the old GUI's visual structure.

Audit the existing GUI and Stitch artifacts into explicit keep, replace, and remove groups. Preserve framework, Storybook, testing, or implementation infrastructure only where it remains useful and conformant. Any deletion must be limited to reviewed task scope and followed by verification.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An exact keep, replace, and remove inventory covers legacy pages, components, styles, routes, documentation, and Stitch artifacts.
- [ ] #2 Stitch design authority, instructions, references, and task assumptions are removed from the active frontend workflow.
- [ ] #3 A clean application scaffold builds, lints, and tests with the approved framework and repository conventions.
- [ ] #4 Figma is the sole design input for new visual and interaction implementation.
- [ ] #5 Prototype-only or mock-backed capability claims are not carried into the clean foundation as production behavior.
- [ ] #6 Every approved removal is verified after execution, and retained infrastructure has an explicit purpose.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Roadmap re-baseline: MAI-95 is blocked only by the bounded desktop-first MAI-94 MVP prototype. Deferred MAI-93 responsive/noncritical scope and deferred MAI-94 comprehensive/admin/external/tablet/mobile coverage are not dependencies for frontend-foundation start.
<!-- SECTION:NOTES:END -->
