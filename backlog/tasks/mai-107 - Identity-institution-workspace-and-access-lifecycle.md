---
id: MAI-107
title: 'Identity, institution, workspace and access lifecycle'
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
updated_date: '2026-08-01 11:15'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - security
  - identity
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
    backlog/docs/decisions/proposed-tenancy-authorization/doc-27 -
    Proposed-ADR-Tenancy-and-Authorization-Model.md
  - >-
    backlog/docs/decisions/proposed-events-outbox-inbox-jobs/doc-31 -
    Proposed-ADR-Events-Outbox-Inbox-and-Jobs.md
priority: high
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P04

Objective
Deliver Identity, Membership, Invitation, Role Policy, Grant, Restriction and Revocation aggregates with an authentication adapter boundary.

Exact scope
Institution/workspace tenancy, safe session context, lifecycle commands and API slices, policy integration and state transitions.

Explicit exclusions
No specific IdP certification, deal participation, frontend redesign or break-glass policy implementation.

Approved dependencies
BE-P02, BE-P03; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-27 through doc-31.

Likely files or subsystems
new `src/identity_access`, API routes and migrations.

Deliverables
Vertical slice, policy integration and lifecycle/state tests.

Acceptance and verification strategy
Tenant/workspace/session and all access lifecycles enforce state, sponsor, expiry and revocation; API, repository and policy tests pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Import identities/memberships using an external-ID map; stage auth enforcement; break-glass rollback only.

Complexity, parallelization and reviews
Extra-large complexity; Wave 3 parallel with BE-P05 and BE-P08. Recommended model: gpt-5.6-sol, High reasoning. Security and data-model reviews required.

Deferred implementation inputs and approval gates
Production identity-provider choice and break-glass operating policy require owner/security approval before provider activation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tenant/workspace/session and all access lifecycles enforce state, sponsor, expiry and revocation; API, repository and policy tests pass.
- [ ] #2 Scope, exclusions, required ADRs, approval gates and review requirements are reflected in implementation evidence.
- [ ] #3 No unauthorized backend/frontend/Figma redesign or production-provider certification is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reconfirm MAI-105/106 public contracts through v1 entry points; exclude Deal participation, break-glass, concrete IdP, registry, audit, GUI, and Figma.
2. Build test-first identity/access lifecycle aggregates, provider-neutral auth port, safe SessionContext, scoped commands/queries, idempotency, events, and immediate revocation revalidation.
3. Add context-owned iam/access migrations and scoped repositories; integrate MAI-105 guarded loading and safe projection, then add additive /api/v1 slices.
4. Prove lifecycle, session, authorization/leakage, API, migration, concurrency, idempotency, import, and PostgreSQL behavior; record rollout/rollback/review evidence and run focused checks plus deno task verify.
<!-- SECTION:PLAN:END -->
