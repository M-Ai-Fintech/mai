---
id: MAI-110
title: 'Deal management, parties and mandate'
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
updated_date: '2026-07-31 21:16'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - deal-domain
  - persistence
  - api
  - frontend-coordination
  - delivery-wave-b
milestone: m-12
dependencies:
  - MAI-107
  - MAI-108
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-modular-monolith-boundaries/doc-25 -
    Proposed-ADR-Target-Modular-Monolith-and-Service-Boundaries.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
priority: high
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P06

Objective
Deliver Deal, Deal Party, Deal Role, Mandate and Authority Constraint aggregates, commands, projections and APIs.

Exact scope
Deal creation/configuration, party/role/mandate constraints, versioned commands, authorization and read models.

Explicit exclusions
No lifecycle transitions, documents, negotiation, closing, external portal or frontend redesign.

Approved dependencies
BE-P04, BE-P05; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-25 through doc-33.

Likely files or subsystems
new `src/deals`, API routes, migrations and projections.

Deliverables
Core deal vertical slice and mandate/authority constraint tests.

Acceptance and verification strategy
Deal, party and mandate commands are versioned and constraints prevent unauthorized or over-limit actions.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Map legacy deals/team; reconcile per deal; rollback through adapter only.

Complexity, parallelization and reviews
Extra-large complexity; Wave 4 serial core domain. Recommended model: gpt-5.6-sol, High reasoning. Data-model approval and frontend coordination required.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Deal, party and mandate commands are versioned and constraints prevent unauthorized or over-limit actions.
- [ ] #2 Scope, exclusions, required ADRs, approval gates and review requirements are reflected in implementation evidence.
- [ ] #3 No unauthorized backend/frontend/Figma redesign or production-provider certification is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-read doc-24, required ADRs and real task dependencies.
2. Obtain listed review/approval gates before irreversible or provider-facing work.
3. Implement only the exact bounded scope with named fakes and focused tests.
4. Execute task-specific and canonical verification, record migration/rollout/rollback evidence, then hand off.
<!-- SECTION:PLAN:END -->
