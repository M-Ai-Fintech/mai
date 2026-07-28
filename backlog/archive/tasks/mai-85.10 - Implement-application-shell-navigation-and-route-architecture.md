---
id: MAI-85.10
title: 'Implement application shell, navigation, and route architecture'
status: To Do
assignee: []
created_date: '2026-07-28 02:57'
updated_date: '2026-07-28 03:11'
labels:
  - frontend
  - app-shell
  - navigation
  - routing
milestone: m-12
dependencies: []
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
parent_task_id: MAI-85
priority: high
ordinal: 1100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
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

## Comments

<!-- COMMENTS:BEGIN -->
author: Codex
created: 2026-07-28 03:10
---
Created with an invalid decimal ID and superseded on 2026-07-28. The authoritative replacement is MAI-98. This record must not be implemented.
---
<!-- COMMENTS:END -->
