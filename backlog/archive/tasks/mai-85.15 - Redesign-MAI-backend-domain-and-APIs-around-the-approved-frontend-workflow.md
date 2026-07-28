---
id: MAI-85.15
title: 'Redesign MAI backend, domain, and APIs around the approved frontend workflow'
status: To Do
assignee: []
created_date: '2026-07-28 02:57'
updated_date: '2026-07-28 03:11'
labels:
  - backend
  - architecture
  - domain-model
  - api-design
  - planning
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
ordinal: 1600
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Redesign the MAI backend architecture, domain model, persistence, permissions, workflows, and API contracts from the approved and verified frontend experience.

This is an architecture and implementation-planning task, not backend implementation. Current MVP routes, mock-backed services, and prototype contracts must be assessed as evidence and may be kept, replaced, or removed; they do not constrain the target model. Backend implementation tasks may be created with the next available IDs only after this redesign is approved.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A screen, action, state, permission, and workflow-to-domain/API gap matrix covers the approved frontend.
- [ ] #2 Canonical domain concepts, aggregates, workflow state machines, commands, events, approval boundaries, and permission rules are defined.
- [ ] #3 Persistence, tenancy and isolation, audit, versioning, evidence, and provenance requirements are explicit.
- [ ] #4 Synchronous APIs, asynchronous jobs, event or streaming needs, and external-integration contracts are defined.
- [ ] #5 Current MVP and prototype routes, stores, services, and contracts are classified as keep, replace, or remove without treating them as constraints.
- [ ] #6 Canonical architecture, product, domain, and ADR documentation is updated through governed Backlog workflows.
- [ ] #7 An independently deliverable, dependency-ordered backend implementation task plan is approved; only then may those tasks be created with the next available IDs.
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Codex
created: 2026-07-28 03:10
---
Created with an invalid decimal ID and superseded on 2026-07-28. The authoritative replacement is MAI-103. This record must not be implemented.
---
<!-- COMMENTS:END -->
