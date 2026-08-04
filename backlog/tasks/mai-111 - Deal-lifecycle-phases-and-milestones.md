---
id: MAI-111
title: 'Deal lifecycle, phases and milestones'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-30 09:28'
updated_date: '2026-08-04 08:51'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - deal-domain
  - workflow
  - api
  - frontend-coordination
  - delivery-wave-c
milestone: m-12
dependencies:
  - MAI-110
  - MAI-109
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
    backlog/docs/decisions/proposed-concurrency-versioning/doc-30 -
    Proposed-ADR-Concurrency-and-Aggregate-Versioning.md
  - >-
    backlog/docs/decisions/proposed-audit-evidence-provenance/doc-32 -
    Proposed-ADR-Audit-Evidence-Versioning-and-Provenance.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
priority: high
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P07

Objective
Deliver Deal Lifecycle, Phase, Milestone and Workstream transition state machines with explicit authority and audit.

Exact scope
Transition tables, prerequisites, invalid transitions, versioned lifecycle commands and activity projections.

Explicit exclusions
No generic status CRUD, document processing, approvals, mandate redesign or frontend route changes.

Approved dependencies
BE-P06, BE-P08; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-26, doc-27, doc-30, doc-32, doc-33.

Likely files or subsystems
new `src/deal_lifecycle`, deal APIs and workflow tests.

Deliverables
Executable lifecycle/milestone transition suite and audited commands.

Acceptance and verification strategy
Every deal lifecycle and milestone transition table case, prerequisite and invalid transition is executable and audited.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Derive legacy phase with explicit uncertainty; cut over commands; rollback read adapter.

Complexity, parallelization and reviews
High complexity; Wave 5 parallel with BE-P09. Recommended model: gpt-5.6-sol, High reasoning. Frontend coordination required.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every deal lifecycle and milestone transition table case, prerequisite and invalid transition is executable and audited.
- [ ] #2 Scope, exclusions, required ADRs, approval gates and review requirements are reflected in implementation evidence.
- [ ] #3 No unauthorized backend/frontend/Figma redesign or production-provider certification is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Wave C execution plan — MAI-111

### Outcome and authority

Deliver the Deal Management-owned lifecycle, phase, and milestone state machines: semantic, versioned commands; explicit transition tables and prerequisites; audited domain events; permission-safe read/activity projections; and an additive PostgreSQL migration. The implementation must satisfy every executable valid, prerequisite-blocked, invalid, stale-version, and idempotent-replay case. MAI-111 remains **To Do** until the Luna implementer starts, then remains **In Progress** through human review and the Wave C finisher; this plan neither authorizes a PR, merge, cutover, approval, or Done transition.

Authority is doc-24 BE-P07 and accepted ADRs doc-26, doc-27, doc-30, doc-32, and doc-33. Deal Management owns lifecycle/milestones; Work Management owns workstreams, tasks, and approval requests. Use only Deal Management-owned tables and application contracts; cross-context information is a stable-ID/version reference or projection, never a direct write. Enforce server-side deny-before-load authorization, tenant/workspace/deal isolation, ETag/If-Match optimistic concurrency, scoped idempotency, append-only audit/provenance, and semantic `/api/v1` commands.

### Ordered exclusive slices

1. **Revalidate start gates and freeze scope.** Re-read MAI-111, MAI-110/MAI-109 completion evidence, doc-24, and ADRs; record the approved data-model and frontend-coordination gates before changing source. Inventory the existing legacy MVP phase code only as migration input. Do not alter `src/api/contracts/deals.ts`, `src/api/routes/deals.ts`, `src/api/store/**`, GUI/Figma, or any MAI-112/MAI-123-owned context.

2. **Model transition truth (exclusive new lifecycle module).** Add Deal-owned lifecycle and milestone value types, state/transition tables, prerequisite evaluator, explicit validation errors, and deterministic activity/read-projection builders under `src/deal_management/lifecycle/`. Represent milestones as aggregate-owned children; keep workstreams/tasks, approvals, findings, document/evidence/processing states, negotiation, and closing conditions out. Cover all table edges, terminal/non-terminal behavior, duplicate/missing IDs, impossible prerequisites, and error shapes with unit tests.

3. **Versioned command and audit integration.** Extend only Deal Management contracts, commands, model, service, projection, repository mapping, and existing HTTP command boundary for named lifecycle-transition and milestone-transition/create commands. Each material command requires authenticated trusted context, authorization before load, expected Deal version/If-Match, scoped idempotency, atomic current-document/history/receipt/outbox/audit persistence, and an append-only event carrying actor, correlation, authorization, prior/next state, prerequisites, and milestone identity. Preserve protected-not-found equivalence and field masking. Do not add generic status CRUD or modify shared platform behavior.

4. **Additive persistence and conservative migration.** Add one Deal Management-owned migration and register it only in `src/deal_management/migrations/index.ts`. It must add only scoped lifecycle/milestone persistence or indexes required by the chosen repository representation; no DROP, rewrite, delete, global cutover, legacy mutation, or fabricated history. Build a legacy phase derivation/read adapter that labels unsupported or ambiguous legacy phase evidence as explicit uncertainty/proposed state, retaining source identity/fingerprint and never promoting it to approved lifecycle history. Prove fresh install and upgrade-from-current schema behavior plus rollback routing: disable new lifecycle commands/read projection, use the explicit legacy read adapter, and retain authoritative Deal rows, versioned history, receipts, audit, outbox, and migration records.

5. **Executable HTTP and PostgreSQL evidence.** Add named-fake service/HTTP tests and isolated PostgreSQL integration tests for happy paths, every invalid/prerequisite edge, auth-before-load/cross-scope denial, ETag race, idempotent replay/mismatch, transaction/audit/outbox atomicity, projection reconstruction, migration/rollback retention, and uncertainty handling. Verify the already composed `/api/v1/deals` runtime without changing unrelated server/MVP routes. Capture frontend coordination as contract/error-state evidence only; no frontend route or Figma change is in scope.

6. **Reviewable handoff.** Run the focused and static gates below, then `DENO_ENV=test deno task verify` to terminal completion. Append exact commands, pass/fail/ignored counts, PostgreSQL environment details, migration rehearsal, remaining limitations, and approval evidence through Backlog. Open a Draft PR only after those gates; keep MAI-111 In Progress, do not self-approve/merge/mark Done, and leave Graphify to the Wave C finisher only.

### Exclusive planned files

- New: `src/deal_management/lifecycle/contracts.ts`, `src/deal_management/lifecycle/transition_tables.ts`, `src/deal_management/lifecycle/prerequisites.ts`, `src/deal_management/lifecycle/model.ts`, `src/deal_management/lifecycle/projection.ts`, `src/deal_management/lifecycle/legacy_phase_adapter.ts`.
- Modify: `src/deal_management/contracts.ts`, `src/deal_management/commands.ts`, `src/deal_management/model.ts`, `src/deal_management/service.ts`, `src/deal_management/projection.ts`, `src/deal_management/repository.ts`, `src/deal_management/http.ts`, `src/deal_management/http_commands.ts`, `src/deal_management/v1.ts`, `src/deal_management/migrations/index.ts`.
- New/modify migration: `src/deal_management/migrations/deal_management_0003_lifecycle_milestones.ts`.
- New: `tests/deal_management/lifecycle_model.spec.ts`, `tests/deal_management/lifecycle_service.spec.ts`, `tests/deal_management/lifecycle_http.spec.ts`, `tests/deal_management/lifecycle_projection.spec.ts`, `tests/deal_management/lifecycle_migration.spec.ts`, `tests/deal_management/lifecycle_postgres.spec.ts`.

Any additional file, especially `src/api/server.ts`, shared platform/authz/audit modules, `src/documents/**`, `src/notifications/**`, old MVP routes/stores/contracts, GUI, Figma, governed docs, or Backlog task fields beyond execution evidence, requires owner approval and a plan update first.

### Verification evidence

Focused command: `DENO_ENV=test deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net tests/deal_management/lifecycle_model.spec.ts tests/deal_management/lifecycle_service.spec.ts tests/deal_management/lifecycle_http.spec.ts tests/deal_management/lifecycle_projection.spec.ts tests/deal_management/lifecycle_migration.spec.ts`.

PostgreSQL command (only with an isolated MAI106_DATABASE_URL): `DENO_ENV=test MAI106_DATABASE_URL='<isolated PostgreSQL URL>' deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net tests/deal_management/lifecycle_postgres.spec.ts tests/deal_management/postgres_integration.spec.ts`; it must report zero ignored lifecycle/PostgreSQL cases. Static checks: `deno fmt --check` and `deno lint` over every touched TypeScript path, `deno check src/deal_management/v1.ts`, and `git diff --check`. Canonical gate: `DENO_ENV=test deno task verify`; a timeout, interruption, unavailable dependency, skipped required category, or non-zero exit is non-passing and blocks handoff claims.

### Risks, checkpoints, exclusions, and approvals

- **Data-model checkpoint:** owner/data-model approval before the migration’s schema and legacy derivation mapping are accepted. Rollout stays per-tenant/per-Deal dry-run/compare first; command cutover requires recorded reconciliation and operator approval; rollback is read-routing only and retains all new records.
- **Authority/security checkpoint:** security review confirms deny-before-load, protected-not-found, field-mask behavior, tenant/workspace/deal isolation, mandatory idempotency, If-Match races, and audit/outbox linkage.
- **Frontend checkpoint:** frontend coordination reviews semantic v1 contract/error states only. No frontend route, visual, Figma, or adapter cutover is authorized.
- **Review gate:** implementation needs human PR review and owner approval; the Wave C finisher performs merged-source review and only then may consider Done. No provider, staging, backup/restore, production-readiness, or production-certification claim is authorized without separately executed environment evidence.
- **Explicit exclusions:** generic status CRUD; Work Management workstreams/tasks/approvals; documents, sources, processing, evidence approval; findings/decisions; negotiation; closing conditions; mandate redesign; legacy MVP route/store replacement; frontend/Figma redesign; provider selection/certification; destructive migration; global legacy cutover; Graphify during planning or implementation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Execution intake 2026-08-04: MAI-109 and MAI-110 are live Done dependencies; branch delivery/MAI-111-deal-lifecycle-phases-and-milestones is isolated from origin/master with no duplicate MAI-111 branch or commit. Re-read doc-24 and accepted ADRs doc-26, doc-27, doc-30, doc-32, doc-33. Graphify was not run because the prompt explicitly prohibits it; focused rg, source/tests, and governed docs were used. The local maestro plan remains uncommitted and skip-worktree. Model route is fixed to 5.6 Luna Max by the operating rules. Data-model, security, and frontend coordination checkpoints remain human review gates.

TDD progress 2026-08-04: lifecycle model and service slices are green (7/7 focused tests); semantic HTTP lifecycle/milestone commands and permission-safe lifecycle/activity/milestone projections are green (7/7 including existing Deal HTTP); additive migration v3 and rollback/legacy uncertainty tests are green (5/5). No Graphify; no GUI/Figma or old API route changes.

Final verification 2026-08-04: focused command DENO_ENV=test deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net tests/deal_management/lifecycle_model.spec.ts tests/deal_management/lifecycle_service.spec.ts tests/deal_management/lifecycle_http.spec.ts tests/deal_management/lifecycle_projection.spec.ts tests/deal_management/lifecycle_migration.spec.ts passed 14/0/0. Required isolated PostgreSQL command passed 3/0/0 with zero ignored; complete tests/deal_management/*.spec.ts passed 99/0/0. Direct DENO_ENV=test MAI106_DATABASE_URL=<isolated URL> deno task test passed 537 with 0 failed and 1 existing non-lifecycle ignored case. deno fmt --check and deno lint over 25 touched TypeScript paths, deno check src/deal_management/v1.ts, and git diff --check all passed. Final DENO_ENV=test MAI106_DATABASE_URL=<isolated URL> deno task verify exited 0 with every canonical documentation, Deno, GUI, build, workflow, Storybook, and interaction category PASS. Migration rehearsal covered additive current-schema upgrade, fresh setup, rollback retention, and legacy read routing; PostgreSQL was only isolated mai_test_mai106 on localhost:55432. Chronology retained: the initial isolated run exposed an undefined audit field and migration cleanup-FK conflict; both were corrected, the isolated schema and ledger alone were reset, and all reruns passed. Initial canonical preflight lacked GUI dependencies and hit sandbox local-bind limits; approved install and escalated rerun passed. No Graphify, GUI/Figma, old API, shared-platform, provider, staging, production, merge, or Done claim. MAI-111 remains In Progress pending Draft PR, human data-model/security/frontend checkpoints, and human review.

Draft PR handoff 2026-08-04: commit 7def4e9 was pushed from delivery/MAI-111-deal-lifecycle-phases-and-milestones and Draft PR #48 was opened against master at https://github.com/luisfelipeluis49/mai/pull/48. PR remains Draft and MAI-111 remains In Progress; no reviewer approval, merge, cutover, or Done transition was performed.

Blocker investigation 2026-08-04: PR #48 has no GitHub review threads or review submissions; the user supplied two verified behavioral blockers. Root cause one is src/deal_management/lifecycle/model.ts transitionMilestone calling assertPrerequisites for every milestone edge while MilestoneTransitionRule has no prerequisite applicability flag, so blocked and cancelled edges are incorrectly rejected. Root cause two is src/deal_management/migrations/deal_management_0003_lifecycle_milestones.ts creating lifecycle_transition_history without the database-level mutation rejection function and trigger already used by immutable evidence migrations. The correction remains within approved lifecycle transition/model/migration and MAI-111 test files; no Wave C sibling or Graphify dependency.

Correction TDD progress 2026-08-04: red regressions reproduced four unmet-prerequisite blocked/cancelled cases and missing database history trigger; green implementation now uses explicit requiresPrerequisites flags for milestone transition rules, preserves prerequisite checks/evidence for active/completed work, and adds deal_management.reject_lifecycle_history_mutation with a BEFORE UPDATE OR DELETE trigger. Fresh loopback-only PostgreSQL evidence passed the append-only insert/update/delete and migration-idempotence regression; no existing database was reset or rolled back.

Final correction verification 2026-08-04: transition-specific prerequisite regressions passed in the focused MAI-111 command at 17 passed, 0 failed, 0 ignored; planned->blocked, planned->cancelled, active->cancelled, blocked->cancelled with unmet prerequisites are allowed, activation and completion remain blocked, and successful prerequisite evidence remains in the result/history. Isolated loopback PostgreSQL MAI106 database at 127.0.0.1:55434/mai_test_mai106 passed lifecycle_postgres.spec.ts plus postgres_integration.spec.ts at 4 passed, 0 failed, 0 ignored; inserts succeeded, UPDATE and DELETE were rejected by the database trigger, the original row remained unchanged, migration application was idempotent, and rollback retention guidance remained covered. Complete tests/deal_management/*.spec.ts passed 103, 0 failed, 0 ignored. Backend deno task test passed 541, 0 failed, 1 unrelated ignored live-agent case. deno fmt --check and deno lint passed over 25 changed TypeScript paths, deno check passed over all 25 changed TypeScript paths, and git diff --check passed. deno task verify:fast passed 11, failed 0, skipped 5, unavailable 2 under its explicit offline profile; the unavailable entries were Live PostgreSQL health and provider health, with MAI-111 PostgreSQL separately proven above and provider integrations out of scope. Canonical DENO_ENV=test deno task verify with the isolated database exited 0 with 17/17 categories PASS. No Graphify output, GUI/Figma, sibling Wave C, shared-platform, provider, rollback, merge, approval, or Done changes were made; MAI-111 remains In Progress pending human review.

Correction handoff 2026-08-04: commit 043d03953ade6face15cbecc890222f3655b9563 (fix(MAI-111): correct lifecycle prerequisite and history invariants) was pushed to delivery/MAI-111-deal-lifecycle-phases-and-milestones; local and origin branch heads match. PR #48 description now contains the exact correction and verification evidence. Connector readback confirms PR #48 is Open, Draft, Unmerged, and has no review submissions, review threads, comments, or requested reviewers. MAI-111 remains In Progress. No Graphify files are in the diff; no merge, approval, ready-for-review conversion, or Done transition was performed.

Governance correction 2026-08-04: MAI-111 remains In Progress for human review. Branch: delivery/MAI-111-deal-lifecycle-phases-and-milestones. Correction commit: 043d03953ade6face15cbecc890222f3655b9563. PR: #48. Milestone prerequisite enforcement is transition-specific; blocked and cancelled transitions remain valid with unmet prerequisites, while activation and completion remain blocked when prerequisites are unmet. Lifecycle transition history is database-enforced append-only; PostgreSQL rejects both UPDATE and DELETE. No MAI-112, MAI-123, Documents, Notifications, platform-jobs, GUI, Figma, provider, or Graphify scope was introduced. Exact verification evidence: Focused MAI-111: 17 passed, 0 failed, 0 ignored. PostgreSQL lifecycle integration: 4 passed, 0 failed, 0 ignored. Complete Deal Management: 103 passed, 0 failed, 0 ignored. Backend test task: 541 passed, 0 failed, 1 unrelated ignored live-agent case. verify:fast: 11 passed, 0 failed. Canonical verification: exit 0, 17/17 categories passed. MAI-111 remains In Progress pending human review and Wave C finalization.
<!-- SECTION:NOTES:END -->
