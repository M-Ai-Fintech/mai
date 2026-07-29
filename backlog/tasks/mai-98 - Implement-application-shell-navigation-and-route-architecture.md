---
id: MAI-98
title: 'Implement application shell, navigation, and route architecture'
status: Done
assignee:
  - '@codex'
created_date: '2026-07-28 03:08'
updated_date: '2026-07-29 21:41'
labels:
  - frontend
  - app-shell
  - navigation
  - routing
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-97
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
  - >-
    backlog/docs/architecture/frontend-shell/doc-18 -
    MAI-98-Application-Shell-and-Route-Architecture.md
priority: high
ordinal: 1100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 10 of the MAI-85 initiative.

Implement the Figma-approved application shell, navigation model, and route architecture as the shared foundation for every screen family.

The shell must support global, deal-context, administration, and external-participant experiences while preserving organization, deal, user, permission, search, task, and notification context.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Global, deal-context, administration, and external-participant shell modes match the approved Figma designs.
- [x] #2 The route map, navigation hierarchy, breadcrumbs, deal context, search, tasks, approvals, and notifications are implemented consistently.
- [x] #3 Permission-restricted, unavailable, not-found, and invalid-context states are explicit.
- [x] #4 Responsive and keyboard navigation behavior matches the approved design and accessibility rules.
- [x] #5 Route, context-preservation, navigation, and access behavior have focused automated tests.
- [x] #6 Typed local adapters isolate screen implementation from unapproved backend contract assumptions.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Baseline
2. Shell and route audit
3. Typed context architecture
4. Shell implementation
5. Navigation and access states
6. Focused tests
7. Bounded rendered review
8. Full verification
9. Draft PR
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Final evidence after PR #18 merge:
- Figma authority: 41:16, 43:10, 44:20, 44:41, 44:62, 44:85.
- Rendered review succeeded: GitHub Actions run 30491977487; artifact 8740158114; digest sha256:bebab2be28a22e184cd4757972b139518b91eae58fa28ee6b5e7c79b30244157.
- Verification: 30 unit files / 67 tests passed; 24 Storybook files / 96 tests passed; all 12 canonical checks passed against the exact final tree.
- Temporary review files are absent from the final tree.
- Owner review found no open P0/P1 defects.
- PR #18 merged into master at 13159995100aacbcc6c72e1579e357a4580531e5.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
MAI-98 application shell and route architecture merged through PR #18 (13159995100aacbcc6c72e1579e357a4580531e5). All six acceptance criteria have final rendered-review and canonical verification evidence.
<!-- SECTION:FINAL_SUMMARY:END -->
