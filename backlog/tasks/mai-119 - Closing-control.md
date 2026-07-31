---
id: MAI-119
title: Closing control
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
updated_date: '2026-07-31 21:17'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - closing
  - security
  - api
  - integration
  - frontend-coordination
  - delivery-wave-g
milestone: m-12
dependencies:
  - MAI-110
  - MAI-113
  - MAI-114
  - MAI-115
  - MAI-147
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-bounded-contexts-aggregate-ownership/doc-26
    - Proposed-ADR-Bounded-Contexts-and-Aggregate-Ownership.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
priority: high
ordinal: 70200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P16

Objective
Deliver Condition, Checklist Item, Waiver, Readiness, Signature evidence, Closing Package and irreversible confirmation controls.

Exact scope
Closing state machines, dual-control and irreversible commands, authority/prerequisite validation, signature evidence and package jobs.

Explicit exclusions
No electronic-signature provider certification, AI waiver/signature or provider selection.

Approved dependencies
BE-P06, BE-P10, BE-P11, BE-P12; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-26 through doc-33.

Likely files or subsystems
new `src/closing`.

Deliverables
State machines, dual-control/irreversibility tests and package job.

Acceptance and verification strategy
Conditions, waivers, readiness, signatures/package and irreversible confirmation authority/prerequisite tests pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Import conditions with evidence review; irreversible commands begin disabled; rollback only before confirmation.

Complexity, parallelization and reviews
Extra-large complexity; Wave 10 parallel with BE-P15. Recommended model: gpt-5.6-sol, High reasoning. Legal, security and frontend reviews required.

Deferred implementation inputs and approval gates
Electronic-signature provider, credentials and production-readiness certification remain explicit gates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Conditions, waivers, readiness, signatures/package and irreversible confirmation authority/prerequisite tests pass.
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
