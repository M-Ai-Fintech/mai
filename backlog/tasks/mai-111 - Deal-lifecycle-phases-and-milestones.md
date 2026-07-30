---
id: MAI-111
title: 'Deal lifecycle, phases and milestones'
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
labels:
  - backend
  - architecture
  - wave-5
  - mai-85-initiative
  - deal-domain
  - workflow
  - api
  - frontend-coordination
milestone: m-12
dependencies:
  - MAI-110
  - MAI-109
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
    backlog/docs/decisions/proposed-audit-evidence-provenance/doc-32 -
    Proposed-ADR-Audit-Evidence-Versioning-and-Provenance.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
priority: high
ordinal: 97000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P07

Objective
Deliver Deal Lifecycle, Phase, Milestone and Workstream transition state machines with explicit authority and audit.

Exact scope
Transition tables, prerequisites, invalid transitions, versioned lifecycle commands and activity projections.

Explicit exclusions
No generic status CRUD, document processing, approvals, mandate redesign or frontend route changes.

Approved dependencies
BE-P06, BE-P08; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-26, doc-27, doc-30, doc-32, doc-33.

Likely files or subsystems
new `src/deal_lifecycle`, deal APIs and workflow tests.

Deliverables
Executable lifecycle/milestone transition suite and audited commands.

Acceptance and verification strategy
Every deal lifecycle and milestone transition table case, prerequisite and invalid transition is executable and audited.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Derive legacy phase with explicit uncertainty; cut over commands; rollback read adapter.

Complexity, parallelization and reviews
High complexity; Wave 5 parallel with BE-P09. Recommended model: gpt-5.6-sol, High reasoning. Frontend coordination required.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every deal lifecycle and milestone transition table case, prerequisite and invalid transition is executable and audited.
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
