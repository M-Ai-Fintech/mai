---
id: MAI-108
title: Organization registry
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-30 09:28'
updated_date: '2026-08-01 23:07'
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
modified_files:
  - src/organization_registry/commands.ts
  - src/organization_registry/contracts.ts
  - src/organization_registry/errors.ts
  - src/organization_registry/ids.ts
  - src/organization_registry/migrations/index.ts
  - src/organization_registry/migrations/organization_registry_0001.ts
  - src/organization_registry/model.ts
  - src/organization_registry/projection.ts
  - src/organization_registry/read_model.ts
  - src/organization_registry/receipts.ts
  - src/organization_registry/repository.ts
  - src/organization_registry/service.ts
  - src/organization_registry/service_helpers.ts
  - src/organization_registry/v1.ts
  - tests/organization_registry/lifecycle.spec.ts
  - tests/organization_registry/migration.spec.ts
  - tests/organization_registry/projection.spec.ts
  - tests/organization_registry/support.ts
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
1. Preserve the isolated delivery/MAI-108-organization-registry branch and map existing legacy entity behavior plus the accepted doc-24/doc-26/doc-27/doc-28/doc-30/doc-33 boundaries; do not use Graphify.
2. Add only src/organization_registry domain contracts and lifecycle commands for tenant-scoped Organization, Legal Entity, and Person aggregates with stable identifiers, explicit states, monotonic versions, expected-version checks, and invariant errors.
3. Add context-owned repository/read-model ports and named in-memory fakes, append-only merge history, and rollback-safe read routing without deleting new records; do not edit MAI-107 IAM/access migrations, src/api/server.ts, generic router seams, or shared API infrastructure.
4. Add permission-safe organization-registry projections that omit restricted PII unless the injected field policy authorizes it; keep API projections unregistered until the MAI-107 merge rebase gate is satisfied.
5. Add additive organization-registry migration definitions and focused TDD coverage for invariants, tenant scope, optimistic versioning, merge history, rollback reads, and restricted-PII omission.
6. Run focused checks, deno task verify, and record exact evidence. After MAI-107 merges, fetch origin and rebase this branch before any /api/v1 route/shared API registration or final PR handoff; never self-merge or mark Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Execution intake 2026-08-01: owner-directed isolated domain work authorized on delivery/MAI-108-organization-registry. MAI-105 and MAI-106 are Done; MAI-107 is still To Do and unmerged. MAI-107 owns src/identity_access/** plus src/api/server.ts generic routing and IAM/access migrations; those paths are excluded. Rebase gate recorded: after MAI-107 merges, run git fetch origin and git rebase origin/master before /api/v1 route registration, shared API composition, or final PR. Read doc-10, doc-24, doc-26, doc-27, doc-28, doc-30, and doc-33. Prompt explicitly forbids Graphify.

Discovery 2026-08-01: no existing src/organization_registry or registry-owned tests. Legacy src/api/store/entities.ts remains an unrelated compatibility store and will not be changed. Public seams selected: OrganizationRegistryService commands, OrganizationRegistryRepository scoped read/write/merge/history port, OrganizationRegistryReadModel, projection functions using existing authz FieldMask, and a named in-memory repository adapter. Aggregates retain tenant/workspace scope, explicit active/archived/merged state, monotonic versions, immutable merge history, and canonical/historical read routing. Additive registry migration stays unregistered until after the MAI-107 rebase gate. New tests will use a named fake clock/id factory/repository, not inline external-I/O stubs.

Verification 2026-08-01: DENO_ENV=test deno test --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net tests/organization_registry/*.spec.ts tests/platform/authz/guard_projection.spec.ts tests/platform/persistence/migration.spec.ts tests/platform/api/v1_contracts.spec.ts exited 0 with 26 passed and 0 failed. deno lint src/organization_registry tests/organization_registry exited 0; deno fmt --check src/organization_registry tests/organization_registry exited 0; git diff --check exited 0. deno task test exited 0 with 271 passed, 0 failed, 21 ignored across 25 steps. deno task verify exited 1: the Deno suite and documentation/i18n/backend-relevant checks passed, while frontend foundation failed on spawnSync git EPERM and GUI unit/build/workflow/Storybook checks lacked vitest, next, playwright, or storybook; no MAI-108 backend failure was observed. No Graphify or provider integration was run per prompt. Local review found only the new organization_registry source/tests plus the Backlog task record. MAI-107 remains To Do and unmerged, so do not register /api/v1 routes, compose shared API infrastructure, push/open the final PR, self-merge, or mark Done. After MAI-107 merges, run git -C /home/luis/mai-worktrees/wave_a/MAI-108 fetch origin and git -C /home/luis/mai-worktrees/wave_a/MAI-108 rebase origin/master, then complete only the authorized shared integration and PR handoff.

Rebase and post-rebase verification 2026-08-01: GitHub confirms MAI-107 PR #36 merged at bdecd20528cb3ae4b17256f09ecb1169cfe03306; git -C /home/luis/mai-worktrees/wave_a/MAI-108 fetch origin updated origin/master, and GRAPHIFY_SKIP_HOOK=1 git -C /home/luis/mai-worktrees/wave_a/MAI-108 rebase origin/master completed. Rebase had only the governed MAI-108 task-record conflict; the committed plan and evidence were retained. No src/identity_access/**, src/api/server.ts, src/platform/api/**, or src/platform/persistence/migrations.ts changes were introduced, and no /api/v1 route or shared-router registration was added. Post-rebase DENO_ENV=test deno task test passed 317, 0 failed, 22 ignored; registry focused tests passed 13, 0 failed; deno lint and deno fmt --check passed; deno task verify exited 1 only for frontend foundation spawnSync git EPERM and missing vitest, next, playwright, or storybook. Task remains In Progress pending human PR review; no Done or merge transition.

PR handoff 2026-08-01: draft PR #40 opened at https://github.com/luisfelipeluis49/mai/pull/40 from delivery/MAI-108-organization-registry against master, initially at commit c12bb9ee6de411c13c58e56d61c0b14b5cf9484c. Task remains In Progress for human data-model/security review and follow-up on unavailable GUI verification dependencies; no self-merge or Done transition was performed.
<!-- SECTION:NOTES:END -->
