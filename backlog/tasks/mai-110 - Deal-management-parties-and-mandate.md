---
id: MAI-110
title: 'Deal management, parties and mandate'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-30 09:28'
updated_date: '2026-08-02 06:56'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - deal-domain
  - persistence
  - api
  - frontend-coordination
  - delivery-wave-b
milestone: m-12
dependencies:
  - MAI-107
  - MAI-108
references:
  - 'https://github.com/luisfelipeluis49/mai/pull/43'
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-modular-monolith-boundaries/doc-25 -
    Proposed-ADR-Target-Modular-Monolith-and-Service-Boundaries.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
modified_files:
  - backlog/tasks/mai-110 - Deal-management-parties-and-mandate.md
  - src/api/server.ts
  - src/deal_management/commands.ts
  - src/deal_management/contracts.ts
  - src/deal_management/errors.ts
  - src/deal_management/http.ts
  - src/deal_management/http_commands.ts
  - src/deal_management/http_response.ts
  - src/deal_management/http_shared.ts
  - src/deal_management/ids.ts
  - src/deal_management/migrations/deal_management_0001.ts
  - src/deal_management/migrations/index.ts
  - src/deal_management/model.ts
  - src/deal_management/projection.ts
  - src/deal_management/read_model.ts
  - src/deal_management/receipts.ts
  - src/deal_management/repository.ts
  - src/deal_management/service.ts
  - src/deal_management/v1.ts
  - tests/deal_management/http.spec.ts
  - tests/deal_management/migration.spec.ts
  - tests/deal_management/model.spec.ts
  - tests/deal_management/postgres_integration.spec.ts
  - tests/deal_management/projection.spec.ts
  - tests/deal_management/repository.spec.ts
  - tests/deal_management/service.spec.ts
  - tests/deal_management/support.ts
priority: high
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P06

Objective
Deliver Deal, Deal Party, Deal Role, Mandate and Authority Constraint aggregates, commands, projections and APIs.

Exact scope
Deal creation/configuration, party/role/mandate constraints, versioned commands, authorization and read models.

Explicit exclusions
No lifecycle transitions, documents, negotiation, closing, external portal or frontend redesign.

Approved dependencies
BE-P04, BE-P05; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-25 through doc-33.

Likely files or subsystems
new `src/deals`, API routes, migrations and projections.

Deliverables
Core deal vertical slice and mandate/authority constraint tests.

Acceptance and verification strategy
Deal, party and mandate commands are versioned and constraints prevent unauthorized or over-limit actions.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Map legacy deals/team; reconcile per deal; rollback through adapter only.

Complexity, parallelization and reviews
Extra-large complexity; Wave 4 serial core domain. Recommended model: gpt-5.6-sol, High reasoning. Data-model approval and frontend coordination required.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Deal, party and mandate commands are versioned and constraints prevent unauthorized or over-limit actions.
- [x] #2 Scope, exclusions, required ADRs, approval gates and review requirements are reflected in implementation evidence.
- [x] #3 No unauthorized backend/frontend/Figma redesign or production-provider certification is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm MAI-107 and MAI-108 Done, consume only their v1 exports, and preserve doc-24/ADR-25..33 boundaries; no Graphify, lifecycle, frontend, provider, RLS, or legacy cutover work. 2. Add src/deal_management domain IDs/contracts/errors/model/commands/service/repository/receipts/projection/read_model/v1 with Deal as root, owned party/role/mandate/authority constraints, stable Identity Access/Organization references, scoped deny-before-load authorization, version/ETag and actor-command-target idempotency. 3. Add context-owned additive migration and transaction-scoped PostgreSQL repository/outbox integration plus rollback/read-routing evidence, without changing platform or upstream migrations. 4. Add semantic /api/v1 command/read HTTP handler, safe DTOs and server registration only; cover unauthorized/absent equivalence, scope isolation, ceilings, stale If-Match, replay mismatch, safe omission, migration rollback/routing and transaction behavior. 5. Run focused Deno tests, formatting/lint/check, diff check, relevant platform/upstream contracts, deno task test, and DENO_ENV=test deno task verify; record exact outcomes and hand off an unapproved Draft PR containing MAI-110 while leaving the task In Progress.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Dependencies revalidated: MAI-107 is Done at bdecd205 and MAI-108 is Done at 250ef374. Required doc-24 and ADR doc-25 through doc-33 boundaries were read. Prompt explicitly prohibited Graphify, so discovery and verification used focused rg, source/tests, and governed docs only. The task remains In Progress; no lifecycle, documents, negotiation, closing, external portal, frontend/Figma, provider certification, RLS, or legacy cutover work was added.

Focused evidence: DENO_ENV=test deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net tests/deal_management/*.spec.ts -> 19 passed, 0 failed, 1 ignored because MAI106_DATABASE_URL is unset. Relevant platform/Identity Access/Organization Registry contracts -> 36 passed, 0 failed. deno fmt --check src/deal_management tests/deal_management src/api/server.ts -> pass; deno lint src/deal_management tests/deal_management src/api/server.ts -> pass; deno check src/deal_management/v1.ts src/api/server.ts -> pass; git diff --check -> pass.

Broader evidence: deno task test -> 435 passed, 0 failed, 23 ignored. DENO_ENV=test deno task verify -> Deno tests and documentation/i18n/token gates passed, but canonical verification was non-passing because gui/scripts/verify-frontend-foundation.mjs hit spawnSync git EPERM and GUI dependencies vitest, next, playwright, and storybook were unavailable. This is an environment gate, not a pass. Migration tests cover additive ownership, no DROP, rollback retention notes, and unregistered context routing; PostgreSQL Deal integration is present but ignored without MAI106_DATABASE_URL.

Final post-edit evidence: deno task test exited 0 with 435 passed, 0 failed, 23 ignored. DENO_ENV=test deno task verify exited 1; PASS Canonical documentation, I18n Strings Check, Deno tests, frontend design tokens, component/shell/screen/Figma conformance and Storybook documentation; FAIL frontend foundation boundary (spawnSync git EPERM), GUI unit tests (vitest not found), Next.js production build (next not found), frontend principal workflows (playwright not found), Storybook build (storybook not found), and Storybook interaction tests (vitest not found).

Handoff: commit 1c62c2f feat(MAI-110): add deal management core. Draft PR opened at https://github.com/luisfelipeluis49/mai/pull/43. PR is intentionally unapproved and unmerged; owner review, GUI dependency installation/environment repair, and canonical verification rerun remain pending. Task stays In Progress.

Live PR check: PR #43 is OPEN and Draft against master with mergeStateStatus CLEAN, no review decision, and no status checks reported yet. No approval or merge was performed.
<!-- SECTION:NOTES:END -->
