---
id: MAI-114
title: 'Workstreams, tasks and approval requests'
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
updated_date: '2026-07-31 21:16'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - workflow
  - approvals
  - security
  - api
  - frontend-coordination
  - delivery-wave-e
milestone: m-12
dependencies:
  - MAI-110
  - MAI-111
  - MAI-113
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
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P11

Objective
Deliver Workstream and Task state machines plus exact-version Approval Request packages and named approver separation of duties.

Exact scope
Workstream/task commands, named approvers, SoD, approve/reject/withdraw transitions, notifications via event contracts and read models.

Explicit exclusions
No domain-specific approval outcome implementation beyond target command dispatch, AI decision or frontend redesign.

Approved dependencies
BE-P06, BE-P07, BE-P10; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-26, doc-27, doc-30 through doc-33.

Likely files or subsystems
new `src/work_management`.

Deliverables
State machines, approval package and policy/concurrency tests.

Acceptance and verification strategy
Workstream/task/approval states, named authority, SoD, exact package version and AI-denial tests pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Map open work conservatively; require re-review for ambiguous approvals; rollback to a read-only legacy view.

Complexity, parallelization and reviews
Extra-large complexity; Wave 7 serial and unlocks BE-P12. Recommended model: gpt-5.6-sol, High reasoning. Security review required.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Workstream/task/approval states, named authority, SoD, exact package version and AI-denial tests pass.
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
