---
id: MAI-135
title: Notifications and subscriptions
status: To Do
assignee: []
created_date: '2026-07-30 09:29'
labels:
  - backend
  - architecture
  - wave-11
  - mai-85-initiative
  - notifications
  - jobs
  - integration
  - security
milestone: m-12
dependencies:
  - MAI-106
  - MAI-107
  - MAI-110
  - MAI-109
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-tenancy-authorization/doc-27 -
    Proposed-ADR-Tenancy-and-Authorization-Model.md
  - >-
    backlog/docs/decisions/proposed-events-outbox-inbox-jobs/doc-31 -
    Proposed-ADR-Events-Outbox-Inbox-and-Jobs.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
priority: medium
ordinal: 121000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P20

Objective
Deliver recipient-safe Notification and Subscription projections with durable delivery jobs.

Exact scope
Subscription lifecycle, recipient-safe projection, event-driven delivery, retry/expiry and delivery receipts.

Explicit exclusions
No marketing broadcast or source-domain mutation.

Approved dependencies
BE-P03, BE-P04, BE-P06, BE-P08; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-27, doc-31, doc-33.

Likely files or subsystems
new `src/notifications`, replace memory store.

Deliverables
Vertical slice, retry/expiry/recipient-isolation tests.

Acceptance and verification strategy
Recipient isolation, subscription versioning, delivery retry/expiry and non-mutating source behavior pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Dual notification projection; stage channels; rollback delivery adapter.

Complexity, parallelization and reviews
Medium complexity; Wave 11 parallel with BE-P19/BE-P21/BE-P22. Recommended model: gpt-5.6-terra, High reasoning. Credentials review required.

Deferred implementation inputs and approval gates
Channel provider selections and credentials remain gates before delivery is enabled.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Recipient isolation, subscription versioning, delivery retry/expiry and non-mutating source behavior pass.
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
