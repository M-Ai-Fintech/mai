---
id: MAI-108
title: Organization registry
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
updated_date: '2026-08-01 11:14'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - organization
  - security
  - persistence
  - api
  - delivery-wave-a
milestone: m-12
dependencies:
  - MAI-105
  - MAI-106
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
    backlog/docs/decisions/proposed-postgresql-schema-transactions/doc-28 -
    Proposed-ADR-PostgreSQL-Schema-and-Transaction-Strategy.md
  - >-
    backlog/docs/decisions/proposed-concurrency-versioning/doc-30 -
    Proposed-ADR-Concurrency-and-Aggregate-Versioning.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
priority: medium
ordinal: 10100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P05

Objective
Deliver Organization, Legal Entity and Person identity/version lifecycle with restricted-field omission and merge semantics.

Exact scope
Organization/entity/person aggregates, versioned lifecycle, merge history, restricted PII DTO policies and API/read models.

Explicit exclusions
No deal-party mandate, external participant portal, identity provider or frontend behavior redesign.

Approved dependencies
BE-P02, BE-P03; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-26, doc-27, doc-28, doc-30, doc-33.

Likely files or subsystems
new `src/organization_registry`, migrations and API projections.

Deliverables
Vertical slice, merge history and restricted-PII policy tests.

Acceptance and verification strategy
Organization, legal entity and person invariants, merge history and restricted PII omission pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Map legacy entities; dual-read comparison; rollback reads without dropping new records.

Complexity, parallelization and reviews
Low complexity; Wave 3 parallel with BE-P04 and BE-P08. Recommended model: gpt-5.6-terra, High reasoning. Data-model and security reviews required.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Organization, legal entity and person invariants, merge history and restricted PII omission pass.
- [ ] #2 Scope, exclusions, required ADRs, approval gates and review requirements are reflected in implementation evidence.
- [ ] #3 No unauthorized backend/frontend/Figma redesign or production-provider certification is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Read BE-P05 and governing ADRs; map existing organization models without Deal Party or portal ownership.
2. Add isolated organization registry aggregates, scoped repository/read ports, merge history, PII-safe DTO omission, and additive migrations/API projections.
3. Preserve non-destructive rollback through read routing; use named fakes and avoid provider, Deal, and frontend scope.
4. Prove invariants, versioning, merge history, tenancy, and PII omission; run focused checks and deno task verify.
<!-- SECTION:PLAN:END -->
