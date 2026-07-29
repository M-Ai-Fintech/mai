---
id: MAI-95
title: Retire Stitch and legacy GUI visuals and establish a clean frontend foundation
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-28 03:08'
updated_date: '2026-07-29 13:15'
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
  - >-
    backlog/docs/architecture/frontend-foundation/doc-15 -
    MAI-95-Frontend-Foundation-Inventory.md
modified_files:
  - >-
    backlog/tasks/mai-95 -
    Retire-Stitch-and-legacy-GUI-visuals-and-establish-a-clean-frontend-foundation.md
  - >-
    backlog/docs/architecture/frontend-foundation/doc-15 -
    MAI-95-Frontend-Foundation-Inventory.md
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - >-
    backlog/docs/governance/document-inventory/doc-12 -
    Documentation-Inventory-and-Classification.md
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Baseline verification. 2. Exact keep / replace / remove inventory. 3. Reviewed legacy retirement. 4. Clean scaffold. 5. Focused and full verification. 6. Draft PR and owner review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Roadmap re-baseline: MAI-95 is blocked only by the bounded desktop-first MAI-94 MVP prototype. Deferred MAI-93 responsive/noncritical scope and deferred MAI-94 comprehensive/admin/external/tablet/mobile coverage are not dependencies for frontend-foundation start.

Intake: MAI-94 is Done; GitHub PR #14 is merged into master at ea15eb528837b83bc1b2158a6cb61478519cc9c5. No existing MAI-95 branch or PR was found. Pre-existing worktree was clean before branch creation.

Baseline verification (pre-mutation): npm --prefix gui ci PASS outside sandbox after sandbox esbuild spawn EPERM; lint PASS; test:unit PASS (19 files, 72 tests); build PASS outside sandbox after sandbox Google Fonts fetch failure; validate:storybook-docs PASS (24 MDX); build-storybook PASS; test-storybook PASS outside sandbox (24 files, 89 tests) after sandbox localhost listen EPERM. All initial failures were environment limitations, not product defects.

Inventory complete before deletion: governed doc-15 records 335 exact GUI paths (44 KEEP, 8 REPLACE, 283 REMOVE), resolved tracked importers, exact route/API dispositions, retained owners, and per-path deletion verification. doc-10 and doc-12 register the new canonical frontend-foundation authority.
<!-- SECTION:NOTES:END -->
