---
id: MAI-106
title: 'Persistence, concurrency, outbox, inbox and jobs'
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
labels:
  - backend
  - architecture
  - wave-2
  - mai-85-initiative
  - persistence
  - migration
  - security
  - jobs
milestone: m-12
dependencies:
  - MAI-104
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
    backlog/docs/decisions/proposed-events-outbox-inbox-jobs/doc-31 -
    Proposed-ADR-Events-Outbox-Inbox-and-Jobs.md
priority: high
ordinal: 92000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P03

Objective
Establish the durable persistence, concurrency, event and job primitives owned by the platform.

Exact scope
Context migration framework, transaction runner, aggregate versions, idempotency records, durable jobs/attempts, transactional outbox, inbox dispatcher and named fakes.

Explicit exclusions
No business-context tables, provider transport, production deployment configuration or feature handlers.

Approved dependencies
BE-P01; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-28, doc-30, doc-31.

Likely files or subsystems
`src/core/db`, new `src/platform/{persistence,events,jobs}`.

Deliverables
Foundational migrations, repositories, worker protocol and recovery tests.

Acceptance and verification strategy
Concurrent updates lose safely; idempotent replay is stable; outbox/jobs survive restart; inbox deduplicates; recovery tests pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Exclusive migration ownership; additive foundation then worker enablement; rollback worker/dispatcher while retaining durable rows.

Complexity, parallelization and reviews
Extra-large complexity; Wave 2 serial database owner. Recommended model: gpt-5.6-sol, High reasoning. Data-model and security reviews required.

Deferred implementation inputs and approval gates
Final RLS scope plus production RPO/RTO values are acceptance gates; production infrastructure selection is not authorized here.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Concurrent updates lose safely; idempotent replay is stable; outbox/jobs survive restart; inbox deduplicates; recovery tests pass.
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
