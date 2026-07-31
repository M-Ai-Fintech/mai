---
id: MAI-107
title: 'Identity, institution, workspace and access lifecycle'
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
updated_date: '2026-07-31 21:15'
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
1. Re-read doc-24, required ADRs and real task dependencies.
2. Obtain listed review/approval gates before irreversible or provider-facing work.
3. Implement only the exact bounded scope with named fakes and focused tests.
4. Execute task-specific and canonical verification, record migration/rollout/rollback evidence, then hand off.
<!-- SECTION:PLAN:END -->
