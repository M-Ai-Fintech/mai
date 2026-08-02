---
id: MAI-107
title: 'Identity, institution, workspace and access lifecycle'
status: Done
assignee:
  - '@codex'
created_date: '2026-07-30 09:28'
updated_date: '2026-08-02 04:34'
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
- [x] #1 Tenant/workspace/session and all access lifecycles enforce state, sponsor, expiry and revocation; API, repository and policy tests pass.
- [x] #2 Scope, exclusions, required ADRs, approval gates and review requirements are reflected in implementation evidence.
- [x] #3 No unauthorized backend/frontend/Figma redesign or production-provider certification is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reconfirm MAI-105 and MAI-106 public v1 contracts, doc-24 and ADRs doc-27 through doc-31; consume authz and persistence/events/jobs only through their v1 entry points. Preserve the explicit exclusions: Deal participation, break-glass, concrete IdP certification, Organization Registry, audit implementation, GUI, and Figma.
2. Build the bounded src/identity_access vertical slice test-first: Institution, Workspace, UserIdentity, Membership, Invitation with token digests only, RolePolicy, PermissionGrant, Restriction, and terminal Revocation lifecycle aggregates. Enforce human-only administration, versions, sponsor/purpose/expiry, deny precedence, state transitions, and retained history.
3. Add the provider-neutral authentication port and named fake, safe SessionContext, injected lifecycle commands/queries, clock, aggregate-version and idempotency handling, atomic domain-event/outbox integration, immediate session invalidation, and background-job revalidation.
4. Add context-owned iam and access migrations/repositories with tenant/workspace scoping and no unscoped loads; keep RLS activation pending explicit approval. Integrate MAI-105 guarded loading and safe DTO projection, then add additive /api/v1 slices with canonical envelopes, concurrency/idempotency, and safe errors.
5. Prove lifecycle, session, authorization/leakage, API, migration, concurrency, idempotency, import/reconciliation, and PostgreSQL behavior. Run focused checks and deno task verify, record migration/rollout/rollback and review evidence, commit and open a human-reviewable PR only for this branch, and leave MAI-107 In Progress pending human review/approval. Do not mark Done or merge.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Intake and discovery 2026-08-01: isolated branch delivery/MAI-107-identity-access-lifecycle at b66526e was clean; MAI-105 and MAI-106 are Done dependencies. No competing local MAI-107 commit/branch was found; GitHub PR search was unavailable because api.github.com could not be reached. Reconfirmed doc-24 and accepted ADRs doc-27, doc-28, doc-30, and doc-31. MAI-105 v1 exports authz through src/platform/authz/v1.ts with deny-before-load, protected-not-found equivalence, and safe DTO projection. MAI-106 v1 exports persistence/events/jobs with transaction-scoped SQL, idempotency, outbox, inbox, and lease-fenced jobs. Baseline deno task verify exited 1: Deno tests and documentation/design/boundary checks passed; GUI foundation failed with sandbox git EPERM and GUI vitest/next/playwright/storybook packages are absent. No project source was changed during discovery.
Execution boundary: no Graphify per the task prompt; no Deal participation, break-glass, concrete IdP certification, Organization Registry, audit implementation, GUI, or Figma.

Implementation evidence 2026-08-01: added the bounded src/identity_access vertical slice and tests for Institution, Workspace, UserIdentity, Membership, Invitation token digests, RolePolicy, PermissionGrant, Restriction, terminal Revocation, human-only administration, scoped versions, sponsor/purpose/expiry, deny precedence, safe sessions, provider-neutral authentication, session/job invalidation, reconciliation, guarded deny-before-load authorization, protected-not-found and safe DTO projection. Added context-owned iam/access migrations and repositories with tenant/workspace predicates, immutable history, atomic outbox writes, additive /api/v1 envelopes with ETag/If-Match/idempotency and safe errors. No RLS activation because explicit approval remains pending; no concrete IdP, Deal, Organization Registry, audit implementation, GUI, Figma or break-glass scope.

Final verification evidence before handoff: scoped identity/access suite with MAI106_DATABASE_URL against isolated mai_test_mai106 PostgreSQL passed 21/21, including real migrations/history/outbox behavior; deno task test passed 278, 0 failed, 22 ignored; deno fmt and scoped deno lint passed; deno task verify exited 1 only on existing GUI environment gates: frontend foundation spawnSync git EPERM, missing vitest, next, playwright and storybook. Deno tests, canonical documentation, i18n, frontend boundary checks and Storybook documentation passed. MAI-107 remains In Progress pending commit/PR publication and human security/data-model review.

Draft handoff evidence 2026-08-01: commit 8c06810e7fd0ddab436dd8c1d9b3a970361e2645 was pushed from delivery/MAI-107-identity-access-lifecycle. Draft PR #36 is open against master at https://github.com/luisfelipeluis49/mai/pull/36. MAI-107 intentionally remains In Progress; human security/data-model review and approval are pending, and no merge or Done transition was performed.

Wave A closure evidence 2026-08-02: owner-approved PR #36 is merged on master at bdecd205; merged identity/access source and focused security/lifecycle checks were reviewed. The final DENO_ENV=test deno task verify completed with exit 0 and all 17 verification categories PASS. No feature implementation was changed during closure.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered identity, institution, workspace, and access lifecycle foundations in merged PR #36. Verified lifecycle, authorization, persistence, and API boundaries plus the canonical DENO_ENV=test deno task verify gate (17/17 PASS, exit 0).
<!-- SECTION:FINAL_SUMMARY:END -->
