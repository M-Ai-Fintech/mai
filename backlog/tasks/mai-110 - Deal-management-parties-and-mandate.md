---
id: MAI-110
title: 'Deal management, parties and mandate'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-30 09:28'
updated_date: '2026-08-03 11:35'
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
  - 'https://github.com/luisfelipeluis49/mai/pull/44'
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
  - >-
    backlog/docs/operations/deal-management/doc-38 -
    MAI-110-Deal-Reconciliation-Operator-Procedure.md
  - backlog/tasks/mai-110 - Deal-management-parties-and-mandate.md
  - graphify-out/GRAPH_REPORT.md
  - graphify-out/graph.json
  - scripts/deal_reconciliation.ts
  - scripts/mai_110_runtime.ts
  - src/api/deal_management_bootstrap.ts
  - src/api/server.ts
  - src/deal_management/composition.ts
  - src/deal_management/composition_support.ts
  - src/deal_management/http.ts
  - src/deal_management/http_commands.ts
  - src/deal_management/http_shared.ts
  - src/deal_management/legacy_contracts.ts
  - src/deal_management/legacy_mapper.ts
  - src/deal_management/legacy_mapper_parties.ts
  - src/deal_management/legacy_mapper_parts.ts
  - src/deal_management/legacy_mapper_validation.ts
  - src/deal_management/legacy_source.ts
  - >-
    src/deal_management/migrations/deal_management_0002_reconciliation_routing.ts
  - src/deal_management/reconciliation.ts
  - src/deal_management/reconciliation_replay.ts
  - src/deal_management/reconciliation_store.ts
  - src/deal_management/reconciliation_verification.ts
  - src/deal_management/v1.ts
  - tests/deal_management/executable_bootstrap.spec.ts
  - tests/deal_management/legacy_reconciliation.spec.ts
  - tests/deal_management/postgres_legacy_source.spec.ts
  - tests/deal_management/postgres_reconciliation.spec.ts
  - tests/deal_management/server_composition.spec.ts
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
PR #44 review correction plan (approved 2026-08-03):\n1. Reconcile all six blocking findings and the function-length standards finding against the current branch head, retaining already-correct later work.\n2. Add a repository-owned executable API bootstrap that loads environment configuration, constructs approved Identity Access authentication, authoritative authorization, PostgreSQL composition, and router dependencies; make import.meta.main execute it with fail-closed startup/readiness behavior.\n3. Make the default PostgreSQL legacy source tenant/workspace-bound and supply a concrete governed reference resolver plus explicit confidentiality/team-authority mapping evidence; reject unprovable scope and mappings.\n4. Complete pre-write reconciliation collision validation and regression evidence proving a conflicting authoritative Deal remains byte/version/history/receipt/outbox unchanged.\n5. Expand verify to inspect intended fingerprint/document, aggregate history/version, command receipts/claims, outbox and audit linkage, then transactionally persist verified status and authoritative routing; cover recovery from applied.\n6. Commit a repository-owned operator runtime factory using the same production composition, authenticated/authorized operator context, real PostgreSQL source/resolver/mapper/repository/store, and deterministic resource cleanup; update doc-38 to its real path.\n7. Make routing compare-and-swap safe in one transaction and add competing PostgreSQL route coverage with one deterministic stale failure.\n8. Split touched functions above 20 lines while preserving repository standards and add PostgreSQL integration coverage for executable bootstrap, production legacy source, cross-scope rejection, verification recovery, and routing concurrency.\n9. Run focused tests, scoped format/lint/check, git diff --check, verify:fast, and all 17 canonical verification categories; append exact pass/fail/ignored evidence without removing earlier chronology.\n10. Update Draft PR #44 and MAI-110 evidence, keep both unapproved/In Progress, and re-review the new head without merging or marking ready.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Dependencies revalidated: MAI-107 is Done at bdecd205 and MAI-108 is Done at 250ef374. Required doc-24 and ADR doc-25 through doc-33 boundaries were read. Prompt explicitly prohibited Graphify, so discovery and verification used focused rg, source/tests, and governed docs only. The task remains In Progress; no lifecycle, documents, negotiation, closing, external portal, frontend/Figma, provider certification, RLS, or legacy cutover work was added.

Focused evidence: DENO_ENV=test deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net tests/deal_management/*.spec.ts -> 19 passed, 0 failed, 1 ignored because MAI106_DATABASE_URL is unset. Relevant platform/Identity Access/Organization Registry contracts -> 36 passed, 0 failed. deno fmt --check src/deal_management tests/deal_management src/api/server.ts -> pass; deno lint src/deal_management tests/deal_management src/api/server.ts -> pass; deno check src/deal_management/v1.ts src/api/server.ts -> pass; git diff --check -> pass.

Broader evidence: deno task test -> 435 passed, 0 failed, 23 ignored. DENO_ENV=test deno task verify -> Deno tests and documentation/i18n/token gates passed, but canonical verification was non-passing because gui/scripts/verify-frontend-foundation.mjs hit spawnSync git EPERM and GUI dependencies vitest, next, playwright, and storybook were unavailable. This is an environment gate, not a pass. Migration tests cover additive ownership, no DROP, rollback retention notes, and unregistered context routing; PostgreSQL Deal integration is present but ignored without MAI106_DATABASE_URL.

Final post-edit evidence: deno task test exited 0 with 435 passed, 0 failed, 23 ignored. DENO_ENV=test deno task verify exited 1; PASS Canonical documentation, I18n Strings Check, Deno tests, frontend design tokens, component/shell/screen/Figma conformance and Storybook documentation; FAIL frontend foundation boundary (spawnSync git EPERM), GUI unit tests (vitest not found), Next.js production build (next not found), frontend principal workflows (playwright not found), Storybook build (storybook not found), and Storybook interaction tests (vitest not found).

Handoff: commit 1c62c2f feat(MAI-110): add deal management core. Draft PR opened at https://github.com/luisfelipeluis49/mai/pull/43. PR is intentionally unapproved and unmerged; owner review, GUI dependency installation/environment repair, and canonical verification rerun remain pending. Task stays In Progress.

Live PR check: PR #43 is OPEN and Draft against master with mergeStateStatus CLEAN, no review decision, and no status checks reported yet. No approval or merge was performed.

Final live reconciliation: PR #43 head is fb60f5069ad0cbbb8c207c2235906c4cfd765c3c (commit fb60f50), Draft=true, OPEN, base=master, mergeStateStatus=CLEAN, reviewDecision empty, statusCheckRollup empty. gh 2.45.0 is authenticated as luisfelipeluis49. No approval, merge, or Done transition was performed.

Post-reconciliation sync: metadata-only commit 5475873 was pushed after the prior live PR snapshot; PR #43 remains Draft and OPEN with no approval or merge. No source or test files changed after the verified implementation commit.

Wave B finisher review 2026-08-02: PR #43 is merged into master at f682576 following owner review; dependencies MAI-107 and MAI-108 are Done. Merged-source review is non-passing, so MAI-110 remains In Progress and was not finalized.

Passing evidence: DENO_ENV=test deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net tests/deal_management/*.spec.ts -> 23 passed, 0 failed, 2 PostgreSQL integration tests ignored because MAI106_DATABASE_URL is unset. deno fmt --check src/deal_management tests/deal_management src/api/server.ts; deno lint src/deal_management tests/deal_management src/api/server.ts; deno check src/deal_management/v1.ts src/api/server.ts; git diff --check -> passed. DENO_ENV=test deno task verify -> exit 0.

Closure blockers requiring a corrective PR: (1) src/api/server.ts registers Deal Management with undefined dependencies, causing every live /api/v1/deals request to return 503; provide approved runtime composition through injected authentication, authorization, repository, receipt, clock, ID and audit/outbox ports, with a server-composition regression test. (2) MAI-110 requires legacy deal/team mapping, per-deal reconciliation, and rollback through an adapter; current migration has only reconciliation tables and rollback prose. Add bounded reconciliation/read-routing adapter evidence and operator procedure, without performing unauthorized legacy cutover. (3) Correct root AGENTS.md breaches: split all new functions over 20 lines, add intent-plus-example docstrings to public functions, replace public data names, extract duplicated route-ID parsing, and include received offending values plus expected shapes in validation errors.

No feature code, Graphify update, task finalization, cleanup, finalization commit, or push was performed by this finisher because review blockers exist.

Corrective Wave B closure evidence (2026-08-02):

- Dedicated worktree/branch: `/home/luis/mai-MAI-110-wave-b-closure`, `fix/MAI-110-wave-b-closure`; base master `104631452e13ff07b6aef942eaf0b8871254312d`, containing merged PR #43 commit `f682576ce065aefa3ca391ead53146f99b3bc0d1`.
- Corrective commits: `e824d63` standards refactor; `ba15030` runtime composition; `5b06259` legacy mapping/reconciliation/rollback adapter; `b191418` tests; `177015b` governed operator documentation.
- Corrective PR: https://github.com/luisfelipeluis49/mai/pull/44, title `MAI-110: complete runtime composition and migration readiness`, head `177015bc944f38b0ce33e169b800edad242dcb38`, base `master`, Draft/Open.
- Runtime composition: `src/deal_management/composition.ts` and `composition_support.ts` construct one process-scoped PostgreSQL pool, transaction runner, scoped Deal repository, service, audit/outbox appender, Identity Access authentication adapter, authoritative authorization port, ID/clock/correlation dependencies, legacy source, mapper, reconciliation store, compatibility reader, and executor. `src/api/server.ts` passes concrete configured HTTP dependencies through `createApiServer`; missing configuration remains a genuine fail-closed `503 DEPENDENCY_UNAVAILABLE`.
- Authentication/authorization: verified Identity Access principals provide actor, tenant, and workspace; invalid credentials return 401, provider failure returns 503, and no permissive production default exists. Authorization remains deny-before-load, scope-aware, field-mask/classification-aware, and fail closed.
- Real server regression: `tests/deal_management/server_composition.spec.ts` creates and reads a Deal through the configured application router and real PostgreSQL, checks ETag, persistence, read-after-write, tenant/workspace scope, protected fields, missing/invalid credentials, authentication outage, missing configuration, and unrelated health routing.
- Legacy inventory: `PostgresLegacyDealSource` reads legacy `transaction`, `transaction_type`, business/party-role, advisor/team, financial structure, and timestamps; absent canonical upstream references are explicit missing-reference outcomes. Legacy-to-authoritative fields, team-to-role translation, mandate-like values, direct mappings, unsupported shapes, and ambiguous values are bounded in `legacy_contracts.ts` and mapper modules.
- Mapping: deterministic SHA-256 legacy source/ID identity, source fingerprint drift detection, typed mapped/already-reconciled/skipped/conflict/invalid/missing-reference/unsupported outcomes, safe received values and expected shapes, explicit operator intervention and retry safety.
- Reconciliation: `dry-run`, `apply`, `resume`, `verify`; dry-run creates no authoritative Deal, aggregate history, outbox event, completed migration receipt, or routing change and may retain only `dry_run_valid` non-authoritative diagnostics. Apply is per Deal, command-idempotent, transaction-backed, resumable, and verifies persisted state before `verified`; one failure does not erase prior successful Deals. Statuses include pending, dry_run_valid, applied, verified, conflict, rejected, rollback_routed.
- Rollback compatibility: named `CompatibilityDealReader` selects one explicit authoritative or legacy source, authorizes before either load, rejects source/scope mismatches, avoids recursive fallback/mixed merges, and persists per-Deal routing plus append-only actor/correlation/reason evidence. Rollback retains authoritative rows, history, audit, outbox, receipts, and reconciliation records.
- Additive migration: `deal_management-0002-reconciliation-routing` adds scoped reconciliation records and routing history only; no destructive SQL, legacy deletion, or global cutover.
- Operator procedure: governed `doc-38 - MAI-110-Deal-Reconciliation-Operator-Procedure.md`, inventoried through governed `doc-12`; includes exact dry-run, apply, resume, verify, rollback-routing, authoritative-routing commands, preconditions, abort conditions, status interpretation, and evidence retention/redaction.
- Standards correction: shared typed route-ID parser used by read and command routes; HTTP/configuration/mapper/reconciliation responsibilities split; public touched boundaries have intent/example docstrings; touched/new modules under 500 lines; validation messages include received values and expected shapes; no production `any` or permissive adapter.
- Verification: focused `tests/deal_management/*.spec.ts` explicit glob 34 passed/0 failed; PostgreSQL-backed focused tests 5 passed/0 ignored, including existing migration/atomicity/concurrent-idempotency tests, reconciliation persistence/routing, and real server composition. Related Identity/Registry/Audit/Authz/API/legacy tests 88 passed; persistence/events tests 27 passed. Scoped formatter/lint checked 27 touched TypeScript files; type checks passed; `git diff --check` passed.
- PostgreSQL evidence: isolated `postgres:16-alpine` container `mai-110-postgres`, port 55433, database `mai_test_mai106`, credentials local test-only; all PostgreSQL tests executed with zero ignored tests. Container cleanup is pending final handoff and will be verified after stopping only this named container.
- Preflight/canonical: `deno task verify:fast` 11 passed/0 failed/5 skipped/2 unavailable under the explicit offline manifest; `DENO_ENV=test deno task verify` passed all 17 canonical categories. Root-wide `deno fmt --check` and `deno lint` still report unrelated baseline findings outside this corrective scope; no scoped changed file has those findings.
- Governance/non-claims: no production/development cutover, no destructive migration, no legacy data deletion, no frontend/Figma changes, no provider-specific infrastructure, no permissive authentication/authorization, no Wave B finisher, and no explicit `graphify update .`. A checkout hook regenerated Graphify outputs during preflight; those outputs were restored and none are in the corrective diff. MAI-110 remains In Progress.
- Acceptance criteria changes: none. Definition of Done changes: none. Historical failed-attempt evidence remains unchanged; this is append-only corrective evidence.

Post-handoff correction (2026-08-02): final canonical verification completed before cleanup. `docker rm -f mai-110-postgres` succeeded and a subsequent named-container listing was empty; the isolated PostgreSQL container is removed. The append-only evidence commit `7f16128` was pushed to corrective PR #44; MAI-110 remains In Progress, PR #44 remains Draft/Open, and no source behavior changed after the verified implementation commits.

Inventory wording correction (2026-08-02): `PostgresLegacyDealSource` directly reads the legacy transaction/type, business party-role, advisor/team, and timestamp sources. Existing legacy read paths also inventory `financial_structure` and phase history, but the bounded source intentionally does not auto-promote those untyped/operational values; mandate-like values require explicit representable input and unsupported values remain explicit outcomes. Draft PR #44 body was corrected accordingly through the GitHub API; no source behavior changed.

PR #44 request-changes review received 2026-08-03 for head 92c2d7b. Current corrective branch is later at 48270bc, so execution first reconciles each finding against current head. Plan approved by the owner prompt; PR remains Draft and MAI-110 remains In Progress.

PR #44 request-changes correction evidence (2026-08-03, final local state):\n\n- Closed executable bootstrap: src/api/server.ts now uses the repository-owned executable bootstrap by default; persisted Identity Access session authentication, authoritative PostgreSQL authorization, Deal composition, and the exact executable router path are covered without production fakes.\n- Closed production legacy mapping: additive reviewed scope/reference mapping tables bind every legacy Deal to tenant/workspace, confidentiality, mandate, canonical Organization Registry/Identity Access references, reference kinds, and team authority. PostgresLegacyDealSource and PostgresLegacyReferenceResolver fail closed for absent/cross-scope evidence.\n- Closed collision mutation: pre-write claim/base/party/role/mandate validation rejects unrelated deterministic-ID collisions. PostgreSQL regression proves unchanged Deal document/version, aggregate history, command receipts, command claims, and outbox.\n- Closed verification evidence: verification checks fresh fingerprint, persisted intended_document, authoritative document, expected history, receipts, claims, outbox, audit, and audit-outbox linkage; status=applied recovery persists verified plus authoritative routing only after all evidence passes.\n- Closed operator runtime: scripts/mai_110_runtime.ts reuses approved production composition, authenticates and scope-validates the operator, uses real PostgreSQL source/resolver/mapper/repository/store, and closes its pool; CLI closes runtime in finally. Governed doc-38 references the committed path and credential.\n- Closed routing concurrency: PostgreSQL SELECT FOR UPDATE serializes route changes and the competing test proves exactly one deterministic stale failure.\n- Closed standards: all changed production TypeScript was challenge-scanned; no unambiguous function remains above 20 substantive lines. Independent final challenge verdict: all seven blockers closed and ready for human re-review.\n\nVerification chronology:\n- Initial PostgreSQL attempts were non-passing: sandbox EACCES, then a stale checksum in the isolated test database after the unmerged migration changed. Only mai_test_mai106 was reset; the later clean-schema executions passed.\n- Final focused: MAI106_DATABASE_URL=postgres://postgres:***@127.0.0.1:55432/mai_test_mai106 DENO_ENV=test deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net 'tests/deal_management/*.spec.ts' -> 41 passed, 0 failed, 0 ignored.\n- Final scoped deno fmt --check, deno lint, deno check for src/api, src/deal_management, both operator scripts, and tests/deal_management -> pass; git diff --check -> pass.\n- Final deno task verify:fast -> 11 passed, 0 failed, 5 skipped, 2 unavailable under its explicit offline profile; unavailable/skipped items are not claimed as passing.\n- Final DENO_ENV=test deno task verify -> all 17 canonical categories PASS.\n- graphify update . completed after final source changes; graph JSON/report refreshed. SQL extraction warned tree_sitter_sql is unavailable, but TypeScript graph extraction completed.\n\nGovernance: MAI-110 remains In Progress. PR #44 must remain Draft/unapproved until owner re-review. No merge, readiness transition, Done transition, cutover, deployment, legacy deletion, or production-readiness claim is authorized.

Local corrective commits created: ecd725a fix(MAI-110): close PR 44 review blockers; 699c1e6 chore(MAI-110): refresh graph evidence. Branch fix/MAI-110-wave-b-closure is ahead of origin by 2. Attempted git push was rejected by the external-egress safety gate because explicit authorization to publish repository code was not established; no connector workaround, PR mutation, readiness transition, approval, or merge was attempted. Owner action: explicitly authorize pushing these commits to origin/fix/MAI-110-wave-b-closure and updating Draft PR #44, or push them manually.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the PR #44 request-changes corrections: real executable bootstrap and operator runtime, scope-bound PostgreSQL legacy mappings/resolver, collision-safe preflight, durable verification evidence and applied recovery, serialized routing, governed operator documentation, PostgreSQL regressions, and changed-production function refactors. Final evidence: 41/41 focused Deal tests with zero PostgreSQL ignores; scoped format/lint/check/diff pass; verify:fast 11 pass/5 skip/2 unavailable offline; all 17 canonical categories pass; independent challenge review closes all seven blockers. Keep MAI-110 In Progress and PR #44 Draft pending owner review; do not merge or mark ready automatically.
<!-- SECTION:FINAL_SUMMARY:END -->
