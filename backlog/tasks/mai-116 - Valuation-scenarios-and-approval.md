---
id: MAI-116
title: Valuation scenarios and approval
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
labels:
  - backend
  - architecture
  - wave-9
  - mai-85-initiative
  - valuation
  - calculations
  - api
  - finance
milestone: m-12
dependencies:
  - MAI-113
  - MAI-115
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-bounded-contexts-aggregate-ownership/doc-26
    - Proposed-ADR-Bounded-Contexts-and-Aggregate-Ownership.md
  - >-
    backlog/docs/decisions/proposed-concurrency-versioning/doc-30 -
    Proposed-ADR-Concurrency-and-Aggregate-Versioning.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
priority: medium
ordinal: 102000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P13

Objective
Deliver Valuation Model, Scenario, Input and Result aggregates with compute job/port, comparison projection, approval and invalidation.

Exact scope
Scenario/version lifecycle, deterministic computation, provenance, stale invalidation and human approval.

Explicit exclusions
No AI-set price, external model certification or provider selection.

Approved dependencies
BE-P10, BE-P12; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-26, doc-30 through doc-33.

Likely files or subsystems
new `src/valuation`, adapt optimization valuation.

Deliverables
Scenario slice, golden algorithm tests and human-approval tests.

Acceptance and verification strategy
Deterministic scenario results/golden tests, provenance, stale invalidation and human-only approval pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Wrap existing algorithms; compare outputs before cutover; rollback compute adapter.

Complexity, parallelization and reviews
High complexity; Wave 9 parallel with BE-P14. Recommended model: gpt-5.6-terra, High reasoning. Finance and data-model reviews required.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Deterministic scenario results/golden tests, provenance, stale invalidation and human-only approval pass.
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
