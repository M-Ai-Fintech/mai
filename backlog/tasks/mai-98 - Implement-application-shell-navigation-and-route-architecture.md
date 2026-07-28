---
id: MAI-98
title: 'Implement application shell, navigation, and route architecture'
status: To Do
assignee: []
created_date: '2026-07-28 03:08'
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
