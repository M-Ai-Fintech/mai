---
id: MAI-126
title: Frontend adapter migration
status: To Do
assignee: []
created_date: '2026-07-30 09:29'
labels:
  - backend
  - architecture
  - wave-13
  - mai-85-initiative
  - frontend-coordination
  - api
  - migration
milestone: m-12
dependencies:
  - MAI-110
  - MAI-111
  - MAI-109
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
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
  - >-
    backlog/docs/decisions/proposed-mvp-api-retirement/doc-36 -
    Proposed-ADR-Migration-and-Retirement-of-the-Mock-backed-MVP-API.md
priority: high
ordinal: 112000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P23

Objective
Replace local API fixtures behind typed adapters family by family while preserving all approved screen states/routes and MAI-102 deviations.

Exact scope
Typed adapter migration, contract tests, family-by-family feature flags/canary and parity evidence for 25 approved screen families; fixtures remain for Storybook/tests.

Explicit exclusions
No visual, route-ownership, Figma or workflow redesign; no backend feature implementation.

Approved dependencies
BE-P06, BE-P07, BE-P08, BE-P09, BE-P10, BE-P11, BE-P12, BE-P13, BE-P14, BE-P15, BE-P16, BE-P17, BE-P18, BE-P19, BE-P20, BE-P21, BE-P22; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-33, doc-36.

Likely files or subsystems
`gui/lib`, fixture adapters/tests/verifiers only.

Deliverables
v1 adapters, contract tests and per-family parity/cutover evidence.

Acceptance and verification strategy
All 25 families pass existing workflow verifier plus contract/error/stale/permission tests against v1; fixtures remain deterministic.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Per-family feature flags/canary; rollback adapter flag rather than backend history.

Complexity, parallelization and reviews
Extra-large complexity; Wave 13 independent family groups after APIs. Recommended model: gpt-5.6-terra, High reasoning. Mandatory frontend coordination review.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All 25 families pass existing workflow verifier plus contract/error/stale/permission tests against v1; fixtures remain deterministic.
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
