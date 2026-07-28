---
id: MAI-85.12
title: Implement deal intelligence and decision screen families
status: To Do
assignee: []
created_date: '2026-07-28 02:57'
updated_date: '2026-07-28 03:11'
labels:
  - frontend
  - screen-implementation
  - deal-intelligence
  - decision-ui
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
ordinal: 1300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement these approved Figma screen families:

- Deal Overview
- Target Dossier
- Documents & VDR
- Diligence Decision Room
- Valuation Lab
- Matching & Counterparty Universe

Use typed local fixtures and adapters where backend behavior has not yet been redesigned.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All six listed screen families are implemented against their approved Figma frames and governed definitions.
- [ ] #2 Evidence, fact, provenance, confidence, approval, and permission boundaries match the approved experience.
- [ ] #3 Shared deal context, cross-screen navigation, decisions, and state transitions are consistent.
- [ ] #4 Required loading, empty, error, restricted, stale-data, destructive-action, and approval states are implemented.
- [ ] #5 Unapproved backend behavior is isolated behind typed local fixtures and adapters without false production claims.
- [ ] #6 Each screen family has focused component, interaction, route, state, and accessibility tests.
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Codex
created: 2026-07-28 03:10
---
Created with an invalid decimal ID and superseded on 2026-07-28. The authoritative replacement is MAI-100. This record must not be implemented.
---
<!-- COMMENTS:END -->
