---
id: MAI-125
title: 'Pause, archive, restore, termination, retention and deletion'
status: To Do
assignee: []
created_date: '2026-07-30 09:29'
updated_date: '2026-07-31 21:17'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - governance
  - security
  - persistence
  - migration
  - api
  - delivery-wave-g
milestone: m-12
dependencies:
  - MAI-110
  - MAI-109
  - MAI-124
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-postgresql-schema-transactions/doc-28 -
    Proposed-ADR-PostgreSQL-Schema-and-Transaction-Strategy.md
  - >-
    backlog/docs/decisions/proposed-events-outbox-inbox-jobs/doc-31 -
    Proposed-ADR-Events-Outbox-Inbox-and-Jobs.md
  - >-
    backlog/docs/decisions/proposed-audit-evidence-provenance/doc-32 -
    Proposed-ADR-Audit-Evidence-Versioning-and-Provenance.md
priority: high
ordinal: 70400
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P22

Objective
Deliver Deal Governance aggregate, consequence previews, multi-context orchestration, holds, deletion request/approval and erasure manifest.

Exact scope
Pause/archive/restore/termination state machines, retention/legal holds, approval-controlled deletion request, resumable jobs and irreversibility checkpoints.

Explicit exclusions
No physical erase without approved retention policy/infrastructure and no generic delete.

Approved dependencies
BE-P06, BE-P08, BE-P21; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-28, doc-31, doc-32.

Likely files or subsystems
new `src/deal_governance`, context jobs.

Deliverables
State machines, resumable jobs and legal-hold/irreversibility tests.

Acceptance and verification strategy
Consequence preview, human-only transitions, retention/hold dominance, resumability and irreversible checkpoint tests pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Begin with pause/archive; rehearse restore; disable erase until policy and backup approvals.

Complexity, parallelization and reviews
Extra-large complexity; Wave 12; exclusive governance/retention/erasure ownership. Recommended model: gpt-5.6-sol, High reasoning. Legal, security and infrastructure reviews required.

Deferred implementation inputs and approval gates
Retention and legal-hold policy, production RPO/RTO, backup/recovery operating policy and cutover window are explicit approval gates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Consequence preview, human-only transitions, retention/hold dominance, resumability and irreversible checkpoint tests pass.
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
