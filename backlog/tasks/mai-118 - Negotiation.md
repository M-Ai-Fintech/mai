---
id: MAI-118
title: Negotiation
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
updated_date: '2026-07-31 05:07'
labels:
  - backend
  - architecture
  - wave-10
  - mai-85-initiative
  - negotiation
  - security
  - api
  - integration
  - frontend-coordination
milestone: m-12
dependencies:
  - MAI-110
  - MAI-113
  - MAI-115
  - MAI-117
  - MAI-146
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
ordinal: 104000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P15

Objective
Deliver Round, Proposal, normalized Terms, Internal Position/BATNA, mandate comparison, approval and separate delivery authorization/job.

Exact scope
Negotiation state machines, internal/external DTO separation, mandate constraints, human approval and separately authorized delivery.

Explicit exclusions
No AI send, email-provider certification or universal term schema.

Approved dependencies
BE-P06, BE-P10, BE-P12, BE-P14; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-26 through doc-33.

Likely files or subsystems
new `src/negotiation`.

Deliverables
Negotiation slice, internal/external DTO tests and send-boundary tests.

Acceptance and verification strategy
Internal fields never enter external DTO; proposal/round states and separate human send idempotency/failure tests pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Import negotiations as records with provenance status; provider delivery feature-gated.

Complexity, parallelization and reviews
Extra-large complexity; Wave 10 parallel with BE-P16. Recommended model: gpt-5.6-sol, High reasoning. Security, frontend and credentials reviews required.

Deferred implementation inputs and approval gates
External communication provider, credentials and production readiness remain required approval gates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Internal fields never enter external DTO; proposal/round states and separate human send idempotency/failure tests pass.
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
