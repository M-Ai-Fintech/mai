---
id: MAI-85.8
title: Implement Figma variables and tokens in the frontend
status: To Do
assignee: []
created_date: '2026-07-28 02:56'
updated_date: '2026-07-28 03:11'
labels:
  - frontend
  - design-tokens
  - figma
  - foundation
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
ordinal: 900
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement a versioned frontend token layer derived from the approved Figma variables and styles. The token layer must be semantic, typed where practical, responsive, testable, and reusable by every component and screen implementation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A documented, versioned mapping connects Figma variables and styles to frontend tokens.
- [ ] #2 Semantic tokens cover color, typography, spacing, sizing, grids, breakpoints, radii, elevation, and motion.
- [ ] #3 Supported themes or modes and responsive behavior match the approved Figma definitions.
- [ ] #4 Automated checks detect invalid token references, drift, or disallowed hard-coded visual values in new design-system code.
- [ ] #5 New frontend components consume semantic tokens rather than duplicating raw design values.
- [ ] #6 Token behavior and usage are covered by documentation and focused tests.
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Codex
created: 2026-07-28 03:10
---
Created with an invalid decimal ID and superseded on 2026-07-28. The authoritative replacement is MAI-96. This record must not be implemented.
---
<!-- COMMENTS:END -->
