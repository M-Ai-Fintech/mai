---
id: MAI-109
title: Immutable audit and activity foundation
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
labels:
  - backend
  - architecture
  - wave-3
  - mai-85-initiative
  - audit
  - security
  - persistence
  - api
milestone: m-12
dependencies:
  - MAI-105
  - MAI-106
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
  - >-
    backlog/docs/decisions/proposed-audit-evidence-provenance/doc-32 -
    Proposed-ADR-Audit-Evidence-Versioning-and-Provenance.md
priority: high
ordinal: 95000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P08

Objective
Deliver append-only Audit Event storage, Activity Projection and deterministic reconstruction/redaction-overlay rules.

Exact scope
Immutable audit records, projection rebuilds, audited export access, correlation and actor/provenance linkage.

Explicit exclusions
No mutable audit history, domain-specific decisions, generic activity CRUD or production retention infrastructure.

Approved dependencies
BE-P02, BE-P03; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-28, doc-30, doc-31, doc-32.

Likely files or subsystems
new `src/audit_activity`, persistence/events/projections.

Deliverables
Append-only store, deterministic rebuild and audit-access tests.

Acceptance and verification strategy
Audit is append-only; redaction is an overlay; projections rebuild deterministically; export access is audited.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Begin dual audit before slice cutovers; rebuild projections; never rollback or delete audit history.

Complexity, parallelization and reviews
Extra-large complexity; Wave 3 parallel with BE-P04 and BE-P05. Recommended model: gpt-5.6-sol, High reasoning. Security and data-model reviews required.

Deferred implementation inputs and approval gates
Production RPO/RTO and retention operating inputs are explicit approval gates; no production infrastructure is selected by this task.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Audit is append-only; redaction is an overlay; projections rebuild deterministically; export access is audited.
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
