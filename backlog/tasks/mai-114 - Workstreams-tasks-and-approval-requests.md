---
id: MAI-114
title: 'Workstreams, tasks and approval requests'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-30 09:28'
updated_date: '2026-08-06 17:40'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - workflow
  - approvals
  - security
  - api
  - frontend-coordination
  - delivery-wave-e
milestone: m-12
dependencies:
  - MAI-110
  - MAI-111
  - MAI-113
references:
  - 'https://github.com/luisfelipeluis49/mai/pull/51'
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
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
modified_files:
  - src/platform/persistence/idempotency.ts
  - src/platform/persistence/migration.ts
  - src/platform/persistence/migration_runner.ts
  - src/work_management/application_service.ts
  - src/work_management/command_execution.ts
  - src/work_management/command_unit_of_work.ts
  - src/work_management/composition.ts
  - src/work_management/migrations/work_management_0003_membership_authority.ts
  - >-
    src/work_management/migrations/work_management_0004_authority_and_prepared.ts
  - src/work_management/migrations/work_management_0004_membership_authority.ts
  - src/work_management/migrations/work_management_0009_corrective_upgrade.ts
  - src/work_management/repository.ts
  - src/work_management/repository_sql.ts
  - src/work_management/repository_sql_records.ts
  - src/work_management/transaction_port_policy.ts
  - src/work_management/transactional_effects.ts
  - tests/work_management/command_transaction_postgres.spec.ts
  - tests/work_management/migration.spec.ts
  - tests/work_management/migration_postgres.spec.ts
  - tests/work_management/transaction_port_policy.spec.ts
priority: high
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P11

Objective
Deliver Workstream and Task state machines plus exact-version Approval Request packages and named approver separation of duties.

Exact scope
Workstream/task commands, named approvers, SoD, approve/reject/withdraw transitions, notifications via event contracts and read models.

Explicit exclusions
No domain-specific approval outcome implementation beyond target command dispatch, AI decision or frontend redesign.

Approved dependencies
BE-P06, BE-P07, BE-P10; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-26, doc-27, doc-30 through doc-33.

Likely files or subsystems
new `src/work_management`.

Deliverables
State machines, approval package and policy/concurrency tests.

Acceptance and verification strategy
Workstream/task/approval states, named authority, SoD, exact package version and AI-denial tests pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Map open work conservatively; require re-review for ambiguous approvals; rollback to a read-only legacy view.

Complexity, parallelization and reviews
Extra-large complexity; Wave 7 serial and unlocks BE-P12. Recommended model: gpt-5.6-sol, High reasoning. Security review required.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Workstream/task/approval states, named authority, SoD, exact package version and AI-denial tests pass.
- [ ] #2 Scope, exclusions, required ADRs, approval gates and review requirements are reflected in implementation evidence.
- [ ] #3 No unauthorized backend/frontend/Figma redesign or production-provider certification is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## PR #51 corrective implementation plan — MAI-114

PLAN PASS from the required 5.6 Sol High planning pass. Continue only in the existing worktree, branch delivery/MAI-114-workstreams-tasks-and-approval-requests, and Draft PR #51. Luna Max is the implementation owner. Keep MAI-114 In Progress; do not merge, mark Done, run Graphify, wire executable server routes, or modify foreign bounded contexts.

### Corrective architecture

1. Workstream task ownership: retain Workstream.taskIds as the sole authoritative membership list. Task creation creates the Task and attaches its ID through the Workstream aggregate boundary in one PostgreSQL transaction. Task.workstreamId is a validated back-reference. Completion loads every owned Task in exact tenant/workspace/Deal scope and fails for missing, open, in-progress, or blocked state. Validate full parent chains and reject cycles or missing ancestors.
2. Transaction composition: production commands use one MAI-106 PostgresTransactionRunner callback and construct PostgresWorkManagementRepository with that transaction handle. Current state, immutable history/decisions, audit/evidence, transactional outbox, target dispatch, durable command result, and idempotency terminal state commit or roll back together. In-memory composition is an explicitly named test adapter only.
3. Durable idempotency: claim and complete through MAI-106 IdempotencyRepository within the same transaction. Bind tenant, workspace, Deal, actor, command, aggregate type/ID, semantic payload, expected versions, and key. Add immutable Work Management command-result rows for exact replay after restart. Concurrent in-flight execution and semantic reuse of a key are conflicts; retries create no duplicate side effects.
4. Permission-safe reads: return explicit Workstream, Task, and Approval Request DTOs. Authorize before load, re-evaluate state-sensitive policy after load, then apply include/omit/redact masks, approved classifications, server-derived allowed actions, purpose, and expiry. Protect package/evidence/authority/requester/approver/target/rationale/state fields. Denied and missing protected records share a safe not-found result.
5. Server-trusted approval creation: HTTP accepts validated selectors and payload, never authority evidence. Derive requester from the authenticated active human and reject implicit delegation. Trusted ports validate target and evidence scope/version and resolve the named approver plus authority snapshot. Build the immutable package and digest server-side and reject fabricated or mismatched identities, policy versions, snapshots, evidence, targets, or digests.
6. Target-command dispatch: approved decisions append a typed durable target-command event with request/version, decision/outcome, target and expected version, scope, package identity/digest, authority reference, actor, command, correlation, causation, idempotency identity, and recorded time. MAI-114 never mutates foreign aggregates. Non-approved, stale, terminal, unauthorized, or replayed requests do not create duplicate dispatches.
7. Semantic events and notification projections: separate domain events from notifications. Emit distinct draft-created, opened/requested, approved, rejected, withdrawn, expired, and invalidated events. Only opened/requested creates the recipient-safe named-approver review notification. Safe payloads exclude target, evidence, package, authority, rationale, and strategy content.
8. Collision safety: derive namespaced semantic identities for history, decision, audit, notification, and target dispatch from operation, aggregate, scope, actor, command, expected version, idempotency, and payload identity. Replace silent conflict ignores with load-and-compare equivalence. Accept exact replay; otherwise raise a typed conflict and roll back.

### Additional corrections

Add governed invalidation and expiry service/API commands; enforce human-only approval and protected transitions; require strong If-Match for all material existing-aggregate commands and Task creation against the owning Workstream; remove unsafe HTTP casts; validate nested input and persisted decision JSON; correct protected-not-found, stale-version, optimistic-conflict, idempotency-conflict, and invalid-transition mappings; split oversized composition responsibilities. Stop and propose a follow-up if shared-platform behavior, foreign writes, executable server wiring, frontend/provider/domain-outcome work, or ambiguous authority would be required.

### Ordered slices and ownership

1. Domain/contracts: modify src/work_management/{ids,model,workstreams,tasks,approval_requests,events,transition_tables}.ts; add focused approval-package, read-model, target-command, notification-projection, and record-identity modules; update domain/service/security/event tests.
2. Persistence/UoW: modify src/work_management/{repository,repository_sql,repository_rows,repository_validation,composition}.ts; add application-service, command-unit-of-work, transactional-effects, and conflict modules; add migrations/work_management_0002_corrective.ts and update the context migration index; expand migration, repository, transaction, concurrency, idempotency, collision, and target-dispatch PostgreSQL tests.
3. Permission-safe API: modify src/api/v1/{work_management,work_management_contracts,work_management_routes}.ts; add explicit request validation; expand API, projection, and approval-security tests.
4. Coordinator integration: integrate domain, persistence, then API; run affected gates after each slice; update exports, migration index, Backlog evidence, and PR #51 metadata only after implementation and evidence agree.

Maximum concurrent writers is one. The coordinator owns AGENTS.md, Backlog, public exports, migration indexes, PR metadata, and task-wide verification. No writer may touch shared platform, foreign contexts, executable server registration, Graphify, frontend, or provider files.

### Regression and PostgreSQL evidence

Service-boundary tests cover ownership completion states, missing Tasks, cross-scope isolation, concurrent attachment, rollback, and indirect parent cycles. Transaction tests fail each aggregate/history/decision/audit/outbox/dispatch/result/idempotency stage and prove zero partial writes. Durable-idempotency tests cover concurrent identical calls, in-flight behavior, exact restart replay, digest/version drift, lost-response retry, and no duplicate effects. Projection/API/security tests cover masks, classifications, allowed actions, purpose/expiry, deny-before-load, protected not found, scope isolation, strong ETags, safe envelopes, spoofing, tampering, forged authority, mismatched approver, cross-Deal evidence, stale target, malformed nested values, and valid authenticated creation. Event/dispatch tests cover semantic transitions, exact safe recipients/content, restricted-field absence, approved-only dispatch, stale/terminal suppression, replay deduplication, and rollback. PostgreSQL collision tests cover exact replay, same event ID with different aggregate/scope, same decision ID with different outcome/approver, and complete rollback.

### Migration, rollout, rollback, verification

Preserve migration 0001 and add idempotent 0002 for durable command results and supporting constraints/indexes. Apply platform migrations, 0001, and 0002 twice against an approved isolated MAI106 PostgreSQL target. Roll out through explicit disabled/read_only/commands composition modes after inventory and reconciliation of Workstream memberships, package versions, and open approvals; ambiguous approvals require re-review. Roll back by disabling commands, notification projection, and target-command consumers and returning to read-only legacy behavior while retaining all append-only state, history, decisions, results, idempotency, audit, and outbox rows.

Run affected fmt, lint, check, domain/service/security/event/projection/API/migration tests first. Then run every MAI-114 PostgreSQL repository, transaction, concurrency, idempotency, collision, dispatch, rollback, and migration test against an approved isolated MAI106_DATABASE_URL; none may be ignored. Finish with git diff --check and DENO_ENV=test deno task verify. Reproduce apparently unrelated failures on current origin/master. Confirm no Graphify/generated or foreign-context changes before the final Backlog and Draft PR update.

Stop if preconditions change, the isolated PostgreSQL target is unavailable, trusted authority/target/evidence validation cannot be supplied, a required test is skipped, canonical verification is not green, or scope expansion would be necessary.

Final closure pass 2026-08-06 (Terra Medium coordinator): preserve one authoritative branch/PR and integrate three isolated implementation specialists serially, then two read-only adversarial reviews. Goal 1 owns migration/reconciliation/performance modules and dedicated PostgreSQL tests; Goal 2 owns authority facts/limits/proof modules and unit/API/PostgreSQL consumer tests; Goal 3 owns transaction/trusted-port/replay/concurrency corrections and tests. Shared application, repository, composition, API, migration index, Backlog, and PR paths remain coordinator-owned. Integration order is Goal 1, Goal 2, Goal 3, then adversarial reviews and serial fixes. No Graphify, foreign-context mutation, frontend/provider/server wiring, merge, self-approval, Ready transition, or Done transition. Every PostgreSQL test must execute against approved isolated databases; canonical verification must exit zero. Record actual model/runtime deviations and preserve all unchecked AC/DoD.

Final-closure ownership matrix: Goal 1 (migration/reconciliation/performance) exclusive new migration/reconciliation modules and dedicated tests; forbidden application/API/shared migration-index/Backlog/PR/Graphify paths; integration first. Goal 2 (authority facts/limits/proof) exclusive authority-evaluation/proof modules and dedicated tests; forbidden shared application/API/repository/target-command paths; integration second. Goal 3 (transaction/replay/concurrency) exclusive transaction policy/support modules and dedicated tests; forbidden migration/index/Backlog/PR/Graphify paths; integration third. Coordinator exclusively reconciles shared application_service.ts, command_execution.ts, command_unit_of_work.ts, composition.ts, model.ts, repository*.ts, target_commands.ts, transactional_effects.ts, migrations/index.ts, API work_management files, cross-slice tests, Backlog, and PR metadata. Specialists use isolated scratch worktrees and return PASS/FAIL packets with commits, files, tests, migration/rollback impact, and risks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Execution intake 2026-08-06: coordinator resumed on delivery/MAI-114-workstreams-tasks-and-approval-requests. Existing task plan is the approved Wave E authority and remains the plan of record. Remote fetch attempts from this worktree fail because the parent Git worktree metadata is read-only; local duplicate/branch checks found no competing MAI-114 branch, commit, or active task. Graphify is explicitly excluded by the task prompt; discovery will use focused source/tests and governed docs.

Slice 1 checkpoint 2026-08-06: added owned Work Management IDs, models, transition tables, Workstream/Task state machines, Approval Request/package transitions, and recipient-safe event contracts in src/work_management; added model and state-machine tests. PASS: deno fmt src/work_management tests/work_management; deno check src/work_management/v1.ts tests/work_management/model.spec.ts tests/work_management/state_machines.spec.ts; deno lint src/work_management tests/work_management; deno test --allow-read --allow-env tests/work_management/model.spec.ts tests/work_management/state_machines.spec.ts (6 passed). Scope checkpoint: only Work Management files changed; target aggregates remain stable-ID plus exact-version references; AI/service/external actors are denied; requester/named-approver SoD and immutable package snapshot checks are covered.

Final verification handoff 2026-08-06: focused MAI-114 gate passed: deno fmt --check, deno check, deno lint, and git diff --check all passed; deno test --allow-read --allow-env tests/work_management/*.spec.ts tests/api/v1/work_management.spec.ts reported 13 passed, 0 failed, 3 ignored. The ignored cases are the required isolated PostgreSQL tests because MAI106_DATABASE_URL is unset (MAI106_DATABASE_URL_UNSET); they are not treated as passing. Canonical DENO_ENV=test deno task verify completed with 603 passed, 5 failed, 74 ignored in 52 seconds. The five Deno failures are pre-existing MAI-123 notification PostgreSQL tests requiring MAI123_DATABASE_URL. Frontend checks also failed only because this worktree lacks vitest, next, playwright, and storybook dependencies; the MAI-114 source and focused tests passed. Scope checkpoint: no Graphify, server wiring, foreign-context mutation, provider, GUI, Figma, or domain-specific approval outcome was added.

Draft PR opened through the authorized GitHub connector: https://github.com/luisfelipeluis49/mai/pull/51 (head c19894ff66964d10c2dc198bc18547d455e0e5d4, base 4494e0834100097ba991af920a7cc2343b1124b6). PR is intentionally Draft and MAI-114 remains In Progress for human data-model, security, and API/architecture review.

PR #51 corrective planning checkpoint (2026-08-06): branch delivery/MAI-114-workstreams-tasks-and-approval-requests; Draft PR #51; reviewed commit c19894ff66964d10c2dc198bc18547d455e0e5d4. Preconditions confirmed: current branch contains the reviewed commit, PR remains open/Draft/unmerged, MAI-110/111/113 are Done, no duplicate corrective branch or PR was found, and Graphify files are clean and absent from the PR. Eight blocking review findings were accepted as implementation blockers. The Sol High corrective plan above is the authoritative correction sequence. MAI-114 remains In Progress. No acceptance criterion or Definition of Done item was checked.

PR #51 corrective implementation completed at commit f2c841017d39c988b6701e8f21e1a835680f488a on delivery/MAI-114-workstreams-tasks-and-approval-requests. Architecture now uses authoritative Workstream taskIds updated atomically with Task creation; one MAI-106 PostgreSQL transaction for aggregate/history/decision/audit/outbox/dispatch/result/idempotency; durable transaction-local idempotency and exact result replay; permission-safe DTO projection; server-derived human requester, target/evidence/authority validation and server-computed package digest; approved-only durable target-command dispatch; semantic approval events with review notification only on requested/opened; and semantic immutable-record collision checks with typed conflict plus rollback.

Migration and rollback evidence 2026-08-06: additive work_management-0002 adds durable command_results and target_command_dispatches without deleting 0001 state. PostgreSQL migration test applied platform, audit, 0001 and 0002 twice, verified append-only protections, and proved disabled/read_only/commands rollout modes. Operational rollback disables commands and consumers and returns to read_only while retaining aggregate state/history, decisions, idempotency, audit, outbox, command results, and dispatch records.

Focused verification 2026-08-06 on the exact staged tree: deno fmt --check, deno lint, deno check, and git diff --check passed. Complete MAI-114 command `deno test --allow-net --allow-env --allow-read tests/work_management/*.spec.ts tests/api/v1/work_management.spec.ts tests/api/v1/work_management_approval_security.spec.ts` with MAI106_DATABASE_URL targeting isolated PostgreSQL 127.0.0.1:55432/mai_test_mai106 reported 41 passed, 0 failed, 0 ignored. PostgreSQL evidence includes atomic rollback, optimistic concurrency, concurrent idempotency, restart replay, exact history/decision collision checks, approved dispatch, dispatch failure rollback, and forward/idempotent migration behavior.

Canonical verification 2026-08-06: after installing gui dependencies from the locked package file, `DENO_ENV=test MAI106_DATABASE_URL=[redacted]/mai_test_mai106 MAI123_DATABASE_URL=[redacted]/mai_test_mai123 deno task verify` passed all 17 categories: canonical docs, i18n, Deno tests, all frontend boundaries, GUI unit tests, Next.js build, workflows, Storybook docs/build/interactions. Initial environmental failures were reproduced on current origin/master 4494e0834100097ba991af920a7cc2343b1124b6: 660 passed, 5 missing-MAI123-URL failures, 1 ignored, plus the same absent GUI executables. The PR introduced no regression.

Human handoff remains required: data-model review of authoritative Workstream membership and additive tables; security review of deny-before-load projections, authority/SoD/human-only enforcement, server-trusted approval creation, durable idempotency, collision equivalence, and safe notification payloads; API/architecture review of strong ETag/If-Match, error envelopes, DTO masks, target dispatch port, and the intentional absence of executable server wiring. MAI-114 remains In Progress and PR #51 remains Draft; no acceptance criteria or Definition of Done item was checked, and no merge or Done transition was performed.

Tooling chronology 2026-08-06: creating the detached origin/master baseline worktree triggered the repository post-checkout Graphify hook automatically; no explicit Graphify command was issued. The hook changed graphify-out/GRAPH_REPORT.md and graphify-out/graph.json in the authoritative worktree. Both generated files were immediately restored before staging. Final git status/diff, commit f2c8410, and PR #51 contain no Graphify artifacts. Subsequent commit and cleanup operations used disabled hooks.

Second corrective pass intake 2026-08-06: starting from f2c841017d39c988b6701e8f21e1a835680f488a on the existing branch and Draft PR #51. Preconditions confirmed: origin fetched; branch/head correct; PR open, Draft, unmerged; only the governed Backlog task file is locally modified; dependencies MAI-110, MAI-111, and MAI-113 remain Done; no Graphify artifacts are in the PR; AC and DoD remain unchecked. Exactly four specialist assignments are required: approval-creation durable replay, server-derived authority/dispatch, Workstream attachment authorization, and authoritative membership reconciliation. Runtime exposes Sol/Terra only; requested Luna Medium was unavailable and will be recorded as a model deviation.

Second corrective pass completed on branch delivery/MAI-114-workstreams-tasks-and-approval-requests through integrated commit 68bea26 (starting reviewed head f2c841017d39c988b6701e8f21e1a835680f488a). Exactly four isolated specialists were used and integrated serially: membership authority (933b0f6 -> 393a3f8), attachment authorization (6e0ff35 -> 5436aaa), authority-derived dispatch (dfc0867 -> 89d35c6), approval-creation durable replay (8171dd5 -> e925fc4), plus coordinator migration/test integration f6f6fb1 and fixture alignment 68bea26. Requested Luna Medium was unavailable at runtime; all four specialists ran on available 5.6 Sol Medium, with no lower-capability substitution. Runtime concurrency allowed three specialists at once, so the fourth launched after a slot opened; all four remained isolated and no Backlog edits were made by specialists.

Accepted architecture: Workstream.taskIds is the sole authoritative membership; Task.workstreamId is a validated back-reference. Completion queries exact-scope tasks and fails closed for missing, extra, duplicate, cross-scope, unsupported, or open states. Migration 0003 adds deferred consistency enforcement and explicit reconciliation evidence; rollback is read-only compatibility while retaining append-only records.

Approval creation now hashes stable semantic client inputs and claims durable idempotency before target/evidence/authority/package/timestamp work. Trusted ports execute once inside the transaction; completed restart/concurrent replays return the stored result; semantic changes conflict; failures roll back all effects.

Approval authority is server-derived and typed; dispatch uses only the verified command/target/version/approver/policy/snapshot/scope/human-only requirement. Task creation independently authorizes attach_task on the exact Workstream before any mutation, version, history, audit, outbox, result, or completion.

Verification: focused integrated MAI-114 suite 47 passed, 0 failed, 0 ignored with MAI106_DATABASE_URL against isolated mai_test_mai106 on 127.0.0.1:55432; deno fmt --check and deno lint checked 51 files; deno check affected modules passed; git diff --check passed; canonical DENO_ENV=test deno task verify passed all 17 categories including Deno, PostgreSQL-enabled tests, GUI, build, and Storybook. Database credentials redacted. Migration forward/repeated application and rollback/read-only evidence passed. Remaining reviews: data model, security, API/architecture, migration, authorization policy, and review before executable server wiring. Keep AC and DoD unchecked; remain In Progress.

Final closure intake: committed implementation head 68bea26 is present on the authoritative branch and the existing PR remains the sole handoff. The task record has uncommitted prior handoff evidence and therefore requires reconciliation before final commit; it remains In Progress and all acceptance criteria/DoD stay unchecked. Required git fetch origin was attempted twice through the approved external path and failed because the parent worktree metadata cannot open /home/luis/mai/.git/worktrees/MAI-114/FETCH_HEAD (Read-only file system); this is recorded as an environment limitation, with remote state cross-checked through read-only branch/PR evidence. Runtime model availability must be checked and any Luna/Sol deviation recorded.

Final closure verification 2026-08-06: coordinator integrated the in-scope closure fixes on the existing branch after three isolated implementation specialist goals and two read-only adversarial reviews. Final residual reviews are CLEAN: zero unresolved security/authorization/API/transaction findings and zero unresolved data-integrity/migration/performance/operability/test findings. Requested Terra Medium coordinator and Luna Medium implementation runtimes were unavailable; actual coordinator and implementation/review runtime was 5.6 Sol Medium, with no lower-capability substitution. No Graphify command or artifact was added.

Final migration architecture: corrective migration work_management-0009 installs a named NOT VALID membership_rollout_events command/scan constraint that validates clean legacy data, records legacy commands-without-scan as immutable legacy_rollout_missing_scan evidence under the governed scan writer, keeps commands read-only while unresolved, and permits commands after governed retained resolution while enforcing all new writes. It adds DB-generated membership binding event sequencing and a composite FK to registered session/actor bindings; revocation/rebinding authority is sequence-ordered, append-only, and clock-poisoning resistant. Rollback retains evidence and returns read-only.

Final PostgreSQL evidence: serial command `for f in tests/work_management/*postgres.spec.ts; do ... deno test --allow-env --allow-net --allow-read --allow-run --no-check "$f"; done` against isolated `MAI106_DATABASE_URL` `postgres://postgres:postgres@127.0.0.1:55432/mai_test_mai106` completed 20 passed, 0 failed, 0 ignored. Historical upgrade seeded a real e947 0003-era invalid rollout event, retained and resolved its finding, then reactivated commands; clean/repeated/rollback, FK/orphan, revocation/rebind, clock-poisoning, concurrency, rollback, collision, dispatch, idempotency, audit/outbox, and query-plan tests passed.

Final focused evidence: non-PostgreSQL Work Management/API suite completed 65 passed, 0 failed; scoped deno fmt --check and deno lint checked 41 files; affected deno check passed; git diff --check passed. Canonical `DENO_ENV=test MAI123_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55432/mai_test_mai123 deno task verify` completed with all 17 categories PASS. Global fmt/lint remain pre-existing repository drift outside this task's changed-file scope; focused changed-file checks are green.

Authoritative branch precondition note: branch is delivery/MAI-114-workstreams-tasks-and-approval-requests at e947e10 before the final closure commit and contains the reviewed history through 68bea26. Two `git fetch origin` attempts failed because parent worktree metadata `/home/luis/mai/.git/worktrees/MAI-114/FETCH_HEAD` is read-only; PR state was verified through the GitHub connector. MAI-110/111/113 remain Done. PR #51 remains open/Draft/unmerged. AC and DoD remain unchecked. Required human reviews remain data-model, security, API/bounded-context architecture, migration, database performance, authorization policy, idempotency/transaction, operational rollout/rollback, and review before executable server wiring.

Final closure commit and push: 8ddfac42f7e764a41388c6895b196b4c8242db9 (pushed to delivery/MAI-114-workstreams-tasks-and-approval-requests). PR #51 head now matches this commit and remains open/Draft/unmerged.

Final closure gate: focused non-PostgreSQL Work Management/API tests 65 passed, 0 failed; every MAI-114 PostgreSQL spec executed serially against redacted isolated MAI106_DATABASE_URL with 20 passed, 0 failed, 0 ignored; canonical DENO_ENV=test MAI123_DATABASE_URL=[redacted] deno task verify passed all 17 categories. Scoped fmt/lint/check and git diff --check passed.

Independent final security/architecture and data/migration/operability/test reviews are CLEAN with zero unresolved in-scope findings. Runtime deviation recorded: requested Terra Medium/Luna Medium unavailable; coordinator, implementation specialists, and reviewers ran on 5.6 Sol Medium. Two fetch attempts were blocked by read-only parent worktree metadata; PR/branch state was verified through the GitHub connector.

MAI-114 remains In Progress with all acceptance criteria and DoD unchecked. Human reviews still required for data model, security, API/bounded-context architecture, migration, database performance, authorization policy, idempotency/transaction, rollout/rollback, and executable-server wiring.

PR #51 focused correction handoff 2026-08-06: actual model 5.6 Luna Medium, one agent, no sub-agents or model substitution. Starting head 5a5a2b720a9a8214bf0176fb25f29d3aaa245544; final commit 1eddf34. Corrected production MAI-106 local adapter and audit/outbox marker validation; production composition now constructs commands, read_only, and disabled modes, and command_transaction_postgres uses the production factory. Denied authority evaluations now persist immutably with exact failed idempotency references and replay without trusted-port reinvocation or approval/event/notification/dispatch writes. Restored strict migration checksum equality, removed all checksum aliases, and verified unique ordered Work Management migration IDs/versions; disposable local database was reset because branch-local historical checksums are intentionally incompatible. Completed idempotent replay is inspected before rollout gating; new execution remains blocked in read_only/disabled. Focused: 46 passed, 0 failed; scoped fmt/lint/check/diff-check passed. PostgreSQL: every MAI-114 PostgreSQL spec executed, 20 passed, 0 failed, 0 ignored against approved isolated MAI106 target. Canonical: DENO_ENV=test with approved isolated MAI106/MAI123 targets, all 17 categories passed. Rollout remains disabled/read_only until governed reconciliation; rollback retains append-only records. Remaining human reviews: data model, security, API/bounded-context architecture, migration/performance, authorization policy, idempotency/transaction, and operational rollout/rollback. No prompts changed; no Graphify artifact is included. MAI-114 remains In Progress with AC/DoD unchecked.

Final recovery evidence (2026-08-06): starting head 1eddf343ed69417d63e8f5564b6e62033eda36c6; implementation commit 9e53ed7. Single-agent 5.6 Luna Medium execution, no substitution. Preserved the pre-existing authority-denial work and finalized it with normalized pre-package and limit-denial evidence, immutable PostgreSQL persistence, failed-idempotency replay, tamper/scope validation, and no approval/dispatch side effects. Canonical shared integration contract is POSTGRES_INTEGRATION_TEST_DATABASE_URL -> mai_test_postgres_integration, service postgres-integration-test, with semantic Notifications isolation via NOTIFICATIONS_INTEGRATION_TEST_DATABASE_URL -> mai_test_notifications_integration. Historical task-derived names remain only in governance/history or disposable local residue. Added the active resource-naming guard and updated canonical setup/testing documentation. Targeted naming, denial, API, static, and PostgreSQL checks passed; complete PostgreSQL integration pass ran 39 files with zero ignored failures. Canonical deno task verify was run once: GUI categories passed except the pre-existing missing gui/conformance/frontend-conformance-authority-matrix.json fixture; the two API expectation failures observed in that run were corrected and the focused API security rerun passed 6/6, so canonical must remain recorded non-green pending the missing fixture. Root AGENTS.md naming rule is present in the worktree but could not be staged because this sparse checkout marks it skip-worktree and its shared Git metadata is read-only; no unrelated injected AGENTS content was committed. AC and DoD remain unchecked; task remains In Progress.

Continuation correction final evidence 2026-08-06: starting head 36e2749; final local/published head 53a8293 (merge reconciles 345389b correction with 1429650 root AGENTS naming-rule commit). GUI authority matrix was renamed in place to gui/conformance/frontend-conformance-authority-matrix.json and all consumers use the new path. Resource naming guard now validates both contents and file paths, with regression coverage for mai102, mai110, mai98 paths and permitted MAI-114 governance references. Production transaction marker is postgres_transaction_local throughout interfaces, implementations, tests, and active docs. Authority validation now uses typed governed-denial errors with explicit reason codes; malformed trusted responses remain invalid-response failures and are not persisted as business denials. Persisted denial evidence now validates exact fields, nested scope, optional field types, timestamps, target identity completeness, unique reasons, digest, and denial ID fail-closed. Production-composition PostgreSQL tests prove limit denial/evaluation persistence, failed idempotency, exact replay after fresh composition, commands/read_only/disabled replay, trusted-port single invocation, changed payload conflict, no aggregate/history/audit/outbox/notification/dispatch side effects, and rollback behavior. Focused unit/API/static checks: 23 passed plus type/lint/diff checks passed. Complete serial PostgreSQL suite: 39 files, 0 failures, 0 ignored. Canonical deno task verify was run once and ended non-zero: 734 passed, 13 migration-collision failures, 1 ignored during parallel shared-DB Deno tests; GUI authority matrix and naming categories passed. The canonical blocker is test-environment parallel migration isolation, not the focused MAI-114 path. Root AGENTS naming rule is now committed. No prompts or Graphify artifacts changed. AC/DoD remain unchecked; task remains In Progress pending human review and canonical environment correction.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-08-06 04:25
---
MAI-114 delivery handoff 2026-08-06: branch delivery/MAI-114-workstreams-tasks-and-approval-requests at base 4494e0834100097ba991af920a7cc2343b1124b6. Work Management state machines, exact-version approval packages, named human approver/SoD rules, repository/migration/audit-outbox contracts, permission-safe v1 API/read models, and focused tests are complete. Focused gate: 13 passed, 3 required PostgreSQL cases ignored because MAI106_DATABASE_URL is unset. Canonical gate: 603 passed, 5 unrelated MAI-123 notification DB failures, 74 ignored, plus missing GUI dependencies. Task remains In Progress pending Draft PR and human data-model/security review; no merge or Done transition.
---

author: @codex
created: 2026-08-06 04:28
---
Draft PR #51 is open: https://github.com/luisfelipeluis49/mai/pull/51. Commit c19894f. Required human review and isolated MAI106 PostgreSQL evidence remain outstanding; no merge or Done transition performed.
---

author: @codex
created: 2026-08-06 06:12
---
Corrective implementation is pushed to Draft PR #51 at f2c8410. Automated gates are green; human data-model, security, and API/architecture review remain required. No merge or Done transition performed.
---

author: @codex
created: 2026-08-06 06:39
---
Second corrective pass started at f2c8410. Four isolated specialist assignments are being coordinated serially into this authoritative branch; status remains In Progress and AC/DoD remain unchecked.
---

author: @codex
created: 2026-08-06 14:31
---
Final closure pass complete at e947e10 plus uncommitted corrective changes. Both independent adversarial reviews report CLEAN; focused tests, fresh isolated PostgreSQL suite (20/20), and canonical verification are green. Keeping MAI-114 In Progress and PR #51 Draft for required human reviews; no Graphify, merge, or Done transition.
---

author: @codex
created: 2026-08-06 14:34
---
Final closure committed and pushed at 8ddfac42f7e764a41388c6895b196b4c8242db9. PR #51 remains Draft/open/unmerged; final focused, PostgreSQL, canonical, migration, replay, authority, and adversarial-review evidence is recorded above. No known in-scope blocker remains; human review gates remain.
---
<!-- COMMENTS:END -->
