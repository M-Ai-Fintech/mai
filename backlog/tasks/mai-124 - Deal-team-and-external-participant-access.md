---
id: MAI-124
title: Deal team and external-participant access
status: To Do
assignee: []
created_date: '2026-07-30 09:29'
updated_date: '2026-07-31 21:16'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - external-access
  - security
  - api
  - frontend-coordination
  - delivery-wave-f
milestone: m-12
dependencies:
  - MAI-107
  - MAI-110
  - MAI-112
  - MAI-114
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-tenancy-authorization/doc-27 -
    Proposed-ADR-Tenancy-and-Authorization-Model.md
  - >-
    backlog/docs/decisions/proposed-postgresql-row-level-security/doc-29 -
    Proposed-ADR-PostgreSQL-Row-Level-Security.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
priority: high
ordinal: 60200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P21

Objective
Deliver Deal Participation, purpose-bound external grant, sponsor/expiry, portal object scope, submission/receipt, revoke and offboard flows.

Exact scope
Deal participation, external-purpose policy, invitation/sponsor/expiry, protected portal DTO/retrieval and revocation/offboarding state machines.

Explicit exclusions
No frontend behavior change or organization membership conflation.

Approved dependencies
BE-P04, BE-P06, BE-P09, BE-P11; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-27, doc-29, doc-33.

Likely files or subsystems
`src/identity_access`, new external portal API.

Deliverables
External-safe projections, revocation and leakage tests.

Acceptance and verification strategy
Invitation/grant requires a human sponsor/scope/expiry; external DTO/retrieval leakage, revoke/offboard and submission tests pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Migrate team as internal grants only after review; external portal remains gated.

Complexity, parallelization and reviews
Extra-large complexity; Wave 11 parallel with BE-P19/BE-P20. Recommended model: gpt-5.6-sol, High reasoning. Mandatory security and frontend coordination reviews.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Invitation/grant requires a human sponsor/scope/expiry; external DTO/retrieval leakage, revoke/offboard and submission tests pass.
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
