---
id: MAI-99
title: 'Implement global, administration, and external screen families'
status: To Do
assignee: []
created_date: '2026-07-28 03:08'
labels:
  - frontend
  - screen-implementation
  - global-ui
  - admin-ui
  - external-ui
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-98
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
priority: high
ordinal: 1200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 11 of the MAI-85 initiative.

Implement these approved Figma screen families:

- Command Center
- Deals Portfolio
- New Deal Setup
- Tasks & Approvals
- Organizations
- Organization Detail
- Team Workspace
- Notification Center
- Global Search
- Settings screen family
- External-participant screen family

Use typed local fixtures and adapters where backend behavior has not yet been redesigned.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All 11 listed screen families are implemented against their approved Figma frames and governed design definitions.
- [ ] #2 Required default, loading, empty, error, permission, unavailable, and destructive-action states are implemented.
- [ ] #3 Role, organization, team, and external-participant access behavior is explicit and consistent.
- [ ] #4 Desktop, tablet, mobile, keyboard, focus, and content behavior conforms to the approved designs.
- [ ] #5 Unapproved backend behavior is isolated behind typed local fixtures and adapters without false production claims.
- [ ] #6 Each screen family has focused component, interaction, route, state, and accessibility tests.
<!-- AC:END -->
