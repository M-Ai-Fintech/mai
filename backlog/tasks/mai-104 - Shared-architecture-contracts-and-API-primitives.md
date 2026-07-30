---
id: MAI-104
title: Shared architecture contracts and API primitives
status: To Do
assignee: []
created_date: '2026-07-30 09:24'
labels:
  - backend
  - architecture
  - wave-1
  - api
  - mai-85-initiative
milestone: m-12
dependencies: []
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-modular-monolith-boundaries/doc-25 -
    Proposed-ADR-Target-Modular-Monolith-and-Service-Boundaries.md
  - >-
    backlog/docs/decisions/proposed-bounded-contexts-aggregate-ownership/doc-26
    - Proposed-ADR-Bounded-Contexts-and-Aggregate-Ownership.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
priority: high
ordinal: 90000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P01

Objective
Establish the versioned shared architecture contracts that all backend bounded contexts consume.

Exact scope
- Branded IDs; actor, tenant, workspace and deal scope context.
- Command/query ports; stable success, error, page and job envelopes.
- Correlation, idempotency and ETag/If-Match parsing conventions.
- Contract validation and canonical API conventions.

Explicit exclusions
No domain handler, authentication provider, database schema, job runner, frontend adapter, Figma, or feature implementation outside the shared contract boundary.

Required ADRs
doc-25, doc-26 and doc-33.

Likely subsystems
`src/shared`, new `src/platform/api`, contract tests.

Deliverables
Versioned shared package, validation/error tests and API conventions.

Migration, rollout and rollback
Additive package with no runtime cutover; rollback is import adoption reversal.

Complexity and coordination
Medium; serial Wave 1 foundation. Recommended model: gpt-5.6-terra, High reasoning. No special review gate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Shared contracts reject malformed identifiers, scope contexts, headers and envelopes.
- [ ] #2 Stable error, pagination, idempotency and ETag contracts are covered by tests.
- [ ] #3 The package is additive and creates no domain handler, schema, provider or frontend behavior change.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-read doc-24 and ADRs doc-25, doc-26 and doc-33.
2. Define and test the shared contract surface with named fakes only.
3. Run focused contract checks and the canonical suite required at execution time.
4. Record migration and consumer-adoption evidence before handoff.
<!-- SECTION:PLAN:END -->
