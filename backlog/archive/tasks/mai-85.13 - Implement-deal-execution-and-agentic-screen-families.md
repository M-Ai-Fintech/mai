---
id: MAI-85.13
title: Implement deal execution and agentic screen families
status: To Do
assignee: []
created_date: '2026-07-28 02:57'
updated_date: '2026-07-28 03:11'
labels:
  - frontend
  - screen-implementation
  - deal-execution
  - agentic-ui
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
ordinal: 1400
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement these approved Figma screen families:

- Negotiation Room
- Closing Control Room
- Agentic Workspace
- Deal Activity & Audit
- Deal Team & Access
- Deliverables & Exports
- Deal Settings & Archive

Use typed local fixtures and adapters where backend behavior has not yet been redesigned.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All seven listed screen families are implemented against their approved Figma frames and governed definitions.
- [ ] #2 Human approval, permission, escalation, audit, destructive-action, and irreversible-transition boundaries match the approved experience.
- [ ] #3 Agentic states truthfully distinguish proposed, running, blocked, failed, and completed work and expose required evidence, citations, and tool activity.
- [ ] #4 Shared deal context and workflow transitions remain consistent across the seven families.
- [ ] #5 Unapproved backend behavior is isolated behind typed local fixtures and adapters without false production claims.
- [ ] #6 Each screen family has focused component, interaction, route, state, and accessibility tests.
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Codex
created: 2026-07-28 03:10
---
Created with an invalid decimal ID and superseded on 2026-07-28. The authoritative replacement is MAI-101. This record must not be implemented.
---
<!-- COMMENTS:END -->
