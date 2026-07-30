---
id: MAI-105
title: Authorization policy model and evaluator
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
labels:
  - backend
  - architecture
  - wave-2
  - mai-85-initiative
  - security
  - policy
milestone: m-12
dependencies:
  - MAI-104
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-tenancy-authorization/doc-27 -
    Proposed-ADR-Tenancy-and-Authorization-Model.md
  - >-
    backlog/docs/decisions/proposed-postgresql-row-level-security/doc-29 -
    Proposed-ADR-PostgreSQL-Row-Level-Security.md
priority: high
ordinal: 91000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P02

Objective
Implement the resource/action/field/purpose/sponsor/expiry authorization vocabulary and server-side policy evaluator.

Exact scope
RBAC, ABAC and relationship-based checks; protected-not-found behavior; deny-before-load; permission-safe DTO policy; decision reasons and leakage regression suite.

Explicit exclusions
No identity-provider certification, membership UI, RLS deployment, frontend behavior change or provider selection.

Approved dependencies
BE-P01; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-27, doc-29.

Likely files or subsystems
new `src/platform/authz`, policy tests.

Deliverables
Policy port/evaluator, decision reasons and protected-data regression suite.

Acceptance and verification strategy
Policy denies before loaders run; protected absent and unauthorized responses are indistinguishable; field omission property tests pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Add shadow policy decisions before enforcement; rollback the enforcement flag but never omit audit.

Complexity, parallelization and reviews
High complexity; Wave 2 parallel with BE-P03. Recommended model: gpt-5.6-sol, High reasoning. Security review required.

Deferred implementation inputs and approval gates
Final PostgreSQL RLS rollout scope and break-glass operating policy remain explicit approval gates; do not resolve them in this task.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Policy denies before loaders run; protected absent and unauthorized responses are indistinguishable; field omission property tests pass.
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
