---
id: MAI-129
title: Data migration and MVP retirement
status: To Do
assignee: []
created_date: '2026-07-30 09:29'
updated_date: '2026-07-31 05:51'
labels:
  - backend
  - architecture
  - wave-14
  - mai-85-initiative
  - migration
  - persistence
  - security
  - frontend-coordination
milestone: m-12
dependencies:
  - MAI-106
  - MAI-109
  - MAI-110
  - MAI-111
  - MAI-112
  - MAI-113
  - MAI-114
  - MAI-115
  - MAI-116
  - MAI-117
  - MAI-118
  - MAI-119
  - MAI-120
  - MAI-121
  - MAI-122
  - MAI-123
  - MAI-124
  - MAI-125
  - MAI-126
  - MAI-127
  - MAI-147
  - MAI-148
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-postgresql-schema-transactions/doc-28 -
    Proposed-ADR-PostgreSQL-Schema-and-Transaction-Strategy.md
  - >-
    backlog/docs/decisions/proposed-concurrency-versioning/doc-30 -
    Proposed-ADR-Concurrency-and-Aggregate-Versioning.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
  - >-
    backlog/docs/decisions/proposed-mvp-api-retirement/doc-36 -
    Proposed-ADR-Migration-and-Retirement-of-the-Mock-backed-MVP-API.md
priority: high
ordinal: 115000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P25

Objective
Implement approved migration, dual-read, reconciliation, cutover and rollback for in-memory fixtures/current PostgreSQL and retire legacy MVP registrations after consumer move.

Exact scope
Migration tooling, reconciliation manifests, staged tenant/deal batches, cutover/rollback and objective retirement proof.

Explicit exclusions
No historical evidence deletion or compatibility shim that distorts the target domain.

Approved dependencies
BE-P03, BE-P06, BE-P07, BE-P08, BE-P09, BE-P10, BE-P11, BE-P12, BE-P13, BE-P14, BE-P15, BE-P16, BE-P17, BE-P18, BE-P19, BE-P20, BE-P21, BE-P22, BE-P23, BE-P24; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-28, doc-30 through doc-33, doc-36.

Likely files or subsystems
migrations, import/reconciliation tools, old API/store/schema.

Deliverables
Rehearsed migration, manifests, rollback and retirement proof.

Acceptance and verification strategy
Rehearsed import/reconcile/cutover/rollback meets thresholds; no prototype writer/consumer remains; historical manifest is retained.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Exclusive migration owner; staged tenant/deal batches; rollback only within documented window.

Complexity, parallelization and reviews
Extra-large complexity; Wave 14 serial cutover. Recommended model: gpt-5.6-sol, High reasoning. Data, security and operations approvals required.

Deferred implementation inputs and approval gates
Approved migration/cutover windows, production RPO/RTO and environment readiness evidence are mandatory go/no-go gates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Rehearsed import/reconcile/cutover/rollback meets thresholds; no prototype writer/consumer remains; historical manifest is retained.
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
