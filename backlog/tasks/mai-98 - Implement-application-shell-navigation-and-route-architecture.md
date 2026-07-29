---
id: MAI-98
title: 'Implement application shell, navigation, and route architecture'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-28 03:08'
updated_date: '2026-07-29 19:50'
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
- [ ] #1 Global, deal-context, administration, and external-participant shell modes match the approved Figma designs.
- [ ] #2 The route map, navigation hierarchy, breadcrumbs, deal context, search, tasks, approvals, and notifications are implemented consistently.
- [ ] #3 Permission-restricted, unavailable, not-found, and invalid-context states are explicit.
- [ ] #4 Responsive and keyboard navigation behavior matches the approved design and accessibility rules.
- [ ] #5 Route, context-preservation, navigation, and access behavior have focused automated tests.
- [ ] #6 Typed local adapters isolate screen implementation from unapproved backend contract assumptions.
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
Baseline GUI checks passed; npm ci initially hit sandbox EPERM executing esbuild and passed with approved execution. Read-only Terra Low audit mapped Figma nodes 41:16, 43:10, 44:85 and documented administration/external variants. Implemented typed local fixture adapters, route registry, four shell modes, explicit context states, focused verifier, and route tests. Focused verify:shell, lint, build, and unit tests pass.

Storybook evidence: Shell/AppShell stories cover GlobalDesktop, DealDesktop, DealMobile, AdministrationDesktop, ExternalParticipant, RestrictedState, InvalidContext, UnavailableState, LongNamesAndCountOverflow, and MobileDrawerKeyboard. Storybook interactions passed: 24 files, 94 tests. Temporary Actions workflow runs 30485532287 and 30485647973 failed before jobs/logs/artifacts; no visual evidence was produced. The workflow was removed in commit 3be500c and is absent from origin/master...HEAD. Final GUI checks passed except the explicitly unresolved deno task verify terminal status: it reaches Deno tests but returns no terminal outcome even when wrapped. Do not open PR until rendered review and canonical verification have terminal evidence.
<!-- SECTION:NOTES:END -->
