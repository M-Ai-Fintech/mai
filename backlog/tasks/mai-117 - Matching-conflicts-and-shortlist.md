---
id: MAI-117
title: 'Matching, conflicts and shortlist'
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
updated_date: '2026-07-31 21:17'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - matching
  - security
  - api
  - workflow
  - delivery-wave-g
milestone: m-12
dependencies:
  - MAI-110
  - MAI-113
  - MAI-115
  - MAI-145
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-bounded-contexts-aggregate-ownership/doc-26
    - Proposed-ADR-Bounded-Contexts-and-Aggregate-Ownership.md
  - >-
    backlog/docs/decisions/proposed-tenancy-authorization/doc-27 -
    Proposed-ADR-Tenancy-and-Authorization-Model.md
  - >-
    backlog/docs/decisions/proposed-concurrency-versioning/doc-30 -
    Proposed-ADR-Concurrency-and-Aggregate-Versioning.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
priority: high
ordinal: 70100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P14

Objective
Deliver Matching Criteria/Run/Candidate projections, Conflict/Restriction and Shortlist/Outreach Authorization state machines.

Exact scope
Versioned matching input, compute jobs, restricted candidate views, conflicts before shortlist/outreach and authority checks.

Explicit exclusions
No outreach send, generic candidate CRUD or unscoped identity search.

Approved dependencies
BE-P06, BE-P10, BE-P12; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-26, doc-27, doc-30 through doc-33.

Likely files or subsystems
new `src/matching`, adapt matching engines.

Deliverables
Compute jobs, protected conflict views and shortlist authority tests.

Acceptance and verification strategy
Matching inputs are versioned; restricted candidates are protected; conflicts precede shortlist/outreach; human-only authority tests pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Import criteria only; recompute candidates; never migrate fixture scores as truth.

Complexity, parallelization and reviews
Extra-large complexity; Wave 9 parallel with BE-P13. Recommended model: gpt-5.6-sol, High reasoning. Security review required.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Matching inputs are versioned; restricted candidates are protected; conflicts precede shortlist/outreach; human-only authority tests pass.
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
