---
id: MAI-96
title: Implement Figma variables and tokens in the frontend
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-28 03:08'
updated_date: '2026-07-29 15:56'
labels:
  - frontend
  - design-tokens
  - figma
  - foundation
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-95
documentation:
  - design/
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
priority: high
ordinal: 900
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 8 of the MAI-85 initiative.

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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Baseline verification.
- Live read-only Figma extraction.
- Normalized source snapshot.
- Generated CSS and TypeScript tokens.
- Responsive and motion behavior.
- Token verification.
- Neutral proof consumer.
- Full repository verification.
- Draft PR and owner review.
<!-- SECTION:PLAN:END -->
