---
id: MAI-123
title: Notifications and subscriptions
status: Done
assignee:
  - '@codex'
created_date: '2026-07-30 09:29'
updated_date: '2026-08-04 11:17'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - notifications
  - jobs
  - integration
  - security
  - delivery-wave-c
milestone: m-12
dependencies:
  - MAI-106
  - MAI-107
  - MAI-110
  - MAI-109
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
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
modified_files:
  - src/notifications/model.ts
  - src/notifications/subscriptions.ts
  - src/notifications/projection.ts
  - src/notifications/v1.ts
  - src/notifications/repository.ts
  - src/notifications/repository_sql.ts
  - src/notifications/repository_sql_queries.ts
  - src/notifications/migrations/notifications_0001.ts
  - src/notifications/migrations/index.ts
  - src/notifications/consumer.ts
  - src/notifications/delivery.ts
  - src/notifications/retry.ts
  - src/notifications/composition.ts
  - src/api/v1/notifications.ts
  - src/api/v1/notifications_contracts.ts
  - src/api/v1/notifications_routes.ts
  - src/api/v1/notifications_routes_support.ts
  - tests/notifications/model.spec.ts
  - tests/notifications/repository_postgres.spec.ts
  - tests/notifications/consumer.spec.ts
  - tests/notifications/delivery.spec.ts
  - tests/notifications/delivery_lease.spec.ts
  - tests/notifications/delivery_failures.spec.ts
  - tests/notifications/delivery_test_support.ts
  - tests/notifications/migration.spec.ts
  - tests/api/v1/notifications.spec.ts
priority: medium
ordinal: 30200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P20

Objective
Deliver recipient-safe Notification and Subscription projections with durable delivery jobs.

Exact scope
Subscription lifecycle, recipient-safe projection, event-driven delivery, retry/expiry and delivery receipts.

Explicit exclusions
No marketing broadcast or source-domain mutation.

Approved dependencies
BE-P03, BE-P04, BE-P06, BE-P08; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-27, doc-31, doc-33.

Likely files or subsystems
new `src/notifications`, replace memory store.

Deliverables
Vertical slice, retry/expiry/recipient-isolation tests.

Acceptance and verification strategy
Recipient isolation, subscription versioning, delivery retry/expiry and non-mutating source behavior pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Dual notification projection; stage channels; rollback delivery adapter.

Complexity, parallelization and reviews
Medium complexity; Wave 11 parallel with BE-P19/BE-P21/BE-P22. Recommended model: gpt-5.6-terra, High reasoning. Credentials review required.

Deferred implementation inputs and approval gates
Channel provider selections and credentials remain gates before delivery is enabled.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Recipient isolation, subscription versioning, delivery retry/expiry and non-mutating source behavior pass.
- [x] #2 Scope, exclusions, required ADRs, approval gates and review requirements are reflected in implementation evidence.
- [x] #3 No unauthorized backend/frontend/Figma redesign or production-provider certification is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Wave C execution plan — MAI-123

### Outcome and constraints

Deliver a recipient-safe, versioned Notification/Subscription projection and a durable, idempotent delivery-job vertical slice. The slice consumes already-committed domain events through the MAI-106 outbox/inbox/jobs foundation, never mutates a source aggregate, and records retry, expiry, terminal/dead-letter, and delivery-receipt evidence. It implements no provider certification or live delivery until channel selection, credentials, security review, and owner approval are recorded. MAI-123 stays **To Do** for planning; its Luna implementation run changes it only to In Progress and leaves it there for human review/finisher handoff.

### Governing evidence and boundaries

- doc-24 maps BE-P20 to MAI-123: recipient-safe Notification/Subscription projections and delivery jobs; it requires recipient isolation, subscription versioning, retry/expiry, dual projection, staged channels, adapter rollback, and channel credentials.
- doc-27 requires tenant/workspace/deal/object/field isolation enforced server-side; unauthorized protected-object existence must not leak.
- doc-31 requires transactional outbox publication, idempotent at-least-once consumers, durable jobs, visible dead letters, and audit/outbox/job trails for side effects.
- doc-33 requires `/api/v1` resource/semantic-command contracts, opaque cursors, protected-not-found behavior, idempotency for commands/jobs/side effects, concurrency handling, and durable-job references for slow/external work.
- Existing MVP `src/api/contracts/notifications.ts`, `src/api/routes/notifications.ts`, and `src/api/store/notifications.ts` are migration inputs only. No direct rewrite, frontend adapter cutover, or source-domain mutation belongs in this task; BE-P25 owns final cutover/retirement.

### Ordered exclusive implementation slices

1. **Notification domain contracts (exclusive: `src/notifications/model.ts`, `src/notifications/subscriptions.ts`, `src/notifications/projection.ts`, `src/notifications/v1.ts`).** Define explicit tenant/workspace/deal recipient scope, subscription identity and monotonically versioned preferences, recipient-safe notification read projection, expiry, delivery state/receipt types, validation, and narrow repository/adapter ports. Require authorization scope as an input before projection or read, and make source event payloads immutable inputs.
2. **PostgreSQL ownership and migration (exclusive: `src/notifications/migrations/notifications_0001.ts`, `src/notifications/migrations/index.ts`, `src/notifications/repository.ts`, `src/notifications/repository_sql.ts`).** Add only a notification-owned schema/tables/indexes plus migration forward/rollback notes and migration-ledger registration. Persist subscription versions, recipient-scoped projections, idempotency keys, job linkage, expiry, and append-only delivery receipts transactionally; reject stale subscription updates and cross-scope reads with protected-not-found semantics.
3. **Event-to-projection and delivery-job workflow (exclusive: `src/notifications/consumer.ts`, `src/notifications/delivery.ts`, `src/notifications/retry.ts`).** Consume outbox events via inbox deduplication, materialize eligible recipient projections without changing their source, enqueue durable delivery jobs with deterministic idempotency keys, and use the MAI-106 worker result model for retry/dead-letter. Check expiry before each attempt; record every attempted/succeeded/expired/terminal outcome as a receipt. Keep the channel adapter a project-owned port and use named fake adapters only.
4. **Additive runtime/API boundary only after slices 1–3 pass (exclusive: `src/notifications/composition.ts`, `src/api/v1/notifications.ts`, `src/api/v1/notifications_routes.ts`).** Compose the repository, event consumer, and disabled-by-default channel adapters. Expose only recipient-authorized versioned read/subscription semantic commands with cursor, ETag/If-Match and idempotency behavior required by doc-33; external delivery returns a durable job reference. Do not alter MVP routes, GUI clients, or provider configuration.
5. **Regression and migration evidence (exclusive: `tests/notifications/model.spec.ts`, `tests/notifications/repository_postgres.spec.ts`, `tests/notifications/consumer.spec.ts`, `tests/notifications/delivery.spec.ts`, `tests/api/v1/notifications.spec.ts`, `tests/notifications/migration.spec.ts`).** Use named fake clock, authorization evaluator, outbox/inbox store, job repository, and channel adapter. Cover tenant/workspace/deal/recipient leakage (including absent-versus-unauthorized equivalence), subscription-version races, duplicate events/jobs, retry/backoff, expiry before delivery, visible dead-letter receipt, source immutability, ETag/idempotency replay, migration apply/rehearsed rollback, and disabled-channel behavior.

### Verification, rollout, rollback, and gates

- Focused checks: `deno fmt --check src/notifications tests/notifications src/api/v1/notifications.ts src/api/v1/notifications_routes.ts`; targeted Deno notification/API-v1 tests with the repository permissions; PostgreSQL migration/repository suite only when the approved test environment is available; then `git diff --check`.
- Canonical gate: `DENO_ENV=test deno task verify` to terminal completion. A timeout, missing dependency/environment, skipped PostgreSQL suite, or interrupted command is non-passing and must be recorded separately from focused evidence.
- Rollout: deploy schema and keep dual notification projection read-only alongside the MVP feed; enable no channel until approved provider selection/credentials, security review, staging/conformance evidence, and owner approval; stage one approved channel/capability at a time with receipt/dead-letter metrics.
- Rollback: disable the channel capability/adapter and route reads to the prior MVP projection; preserve notification rows, subscriptions, inbox records, jobs, receipts, migration ledger, and audit evidence for reconciliation. Do not delete source events or claim a physical schema rollback after any durable production data exists; use the documented reversible adapter/projection path.
- Review gates: architecture/data-model review before migration, security review for recipient isolation and protected-not-found behavior, credentials/provider approval before enabling a channel, API/frontend coordination only if a later adapter task is proposed, and explicit owner approval before PR publication, merge, or any Backlog Done transition.

### Explicit exclusions and collision checkpoints

- Excluded: marketing/broadcast campaigns; source-domain writes; generic notification CRUD; MVP route replacement; GUI/Figma redesign; provider certification, credentials, production enablement, data-retirement/cutover, and any MAI-111 lifecycle or MAI-112 document aggregate work.
- MAI-111 is scoped to `src/deal_lifecycle`, Deal APIs, and workflow tests; MAI-112 is scoped to `src/documents`, VDR adapters, and jobs. No current `src/notifications` files exist and neither task declares notification ownership. Avoid touching shared `src/platform/events`, `src/platform/jobs`, `src/api/mvp_*`, platform migration registries, or generic API composition without a documented cross-task owner decision; those are collision risks rather than planned MAI-123 files.
- Checkpoint before each slice: re-read MAI-123 plus MAI-106/107/109/110 dependency state and active MAI-111/112 task plans; stop for owner direction if a dependency is not Done, shared runtime/migration wiring is required, or provider work is requested.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Execution intake: dedicated worktree /home/luis/mai-worktrees/wave_c/MAI-123 on delivery/MAI-123-notifications-and-subscriptions at 003d1d8; pre-existing worktree change is the Backlog task plan record and is preserved. MAI-106, MAI-107, MAI-109, and MAI-110 are Done; active MAI-111 and MAI-112 remain separate To Do tasks with no notification ownership. Local Wave C plan matches the Backlog plan. MAI-123 is In Progress for Luna implementation and remains In Progress for human review/finisher handoff. Graphify is explicitly prohibited by the execution prompt; discovery uses focused rg, source/tests, governed docs, and Backlog evidence.

Implementation handoff: added the notification-owned domain contracts, versioned subscriptions, authorization-required recipient projection, PostgreSQL migration/repository SQL, inbox-deduplicated outbox consumer, deterministic durable delivery jobs, retry/backoff, expiry, dead-letter and append-only receipt evidence, disabled-by-default channel adapters, additive API v1 routes with opaque cursors, ETag/If-Match, idempotency replay, protected-not-found behavior, and composition guards. Existing MVP notification routes/store, source domains, shared platform migrations, GUI, and provider configuration were not changed. Nullable deal scope uses a notification-owned unique expression index so workspace-level subscriptions cannot duplicate.\n\nValidation: focused notification/API-v1 suite passed 23/0/1 (the one ignored test is the optional PostgreSQL integration because MAI123_DATABASE_URL is unset); deno check passed; deno fmt --check passed; git diff --check passed. Canonical DENO_ENV=test deno task verify reached terminal exit 0 in the escalated environment with every listed gate PASS. The earlier sandbox rerun had only local-port EPERM failures; no source failure.\n\nHandoff boundary: channel enablement, provider credentials/certification, security/architecture review, owner approval, merge, and any Backlog Done transition remain for the human finisher. MAI-123 remains In Progress and the PR must remain Draft.

Draft PR opened through the verified user-owned GitHub repository: https://github.com/luisfelipeluis49/mai/pull/46 (draft, base master, head delivery/MAI-123-notifications-and-subscriptions, commit a1ed11e523ad0332c175fe3887ba596b56912285). No owner approval, merge, provider enablement, or Done transition was performed.

Correction evidence 2026-08-04: commit d1472987b2fbd2304ff1c8c38e58cc465f4b440f (fix(MAI-123): enforce notification delivery and replay isolation) was pushed to PR #46 without rebase, merge, approval, or provider enablement. Focused Notification/API-v1 suite passed 33/33: consumer 4, delivery 6, migration 3, model 5, PostgreSQL repository 8, API v1 7. Fresh isolated PostgreSQL passed 5 integration tests with zero MAI-123 ignored tests: migration and append-only trigger 1, lifecycle 1, exact-scope atomic idempotency 1, concurrent subscription command 1, concurrent delivery command 1. Dedicated concurrency coverage passed 2/2. Append-only evidence passed inserts, rejected UPDATE, rejected DELETE, unchanged receipt, and migration idempotency. Scoped fmt/lint/check/diff checks passed; verify:fast exit 0; canonical DENO_ENV=test deno task verify exit 0 with 17/17 categories passed. Delivery worker now depends only on the Notifications-owned claimNotificationDelivery port; consumer remains enqueue-only; default delivery claiming fails closed; exact-scope idempotency includes tenant/workspace/deal-or-no-deal/actor/command/target/key; no shared platform job, Deal lifecycle, Documents, GUI/Figma, or Graphify diff. MAI-123 remains In Progress and PR #46 remains Draft/Open/Unmerged/Unapproved for human review.

Final post-sync correction evidence 2026-08-04: branch delivery/MAI-123-notifications-and-subscriptions; original correction commit d1472987b2fbd2304ff1c8c38e58cc465f4b440f; PR #46; synchronized with current origin/master 11da22c146ba83f91cb3bec9f518e15d582cad18. The Notifications-owned typed claim boundary remains independent; delivery execution fails closed when unconfigured; the consumer retains enqueue-only authority; exact-scope idempotency, atomic insert-or-observe concurrency handling, append-only delivery receipts, and module-size compliance remain verified. The delivery worker now reads and asserts a fresh pre-adapter lease time and reads a fresh post-adapter time for success, retry, terminal, delivery-state, receipt, retry-policy, scheduling, complete, and fail persistence. Mutable-clock delivery regressions: 9 passed, 0 failed; lease expiry during successful, retryable, and terminal adapter calls leaves only the truthful attempted receipt and prevents post-adapter persistence. Complete Notification/API suite: 36 passed, 0 failed (consumer 4, delivery 9, migration 3, model 5, repository 8, API v1 7). PostgreSQL evidence: 7 passed, 0 failed, 0 ignored MAI-123 PostgreSQL tests (migration 1 and repository 6); concurrency evidence 2 passed, 0 failed; append-only evidence 1 passed, 0 failed. Full backend: 540 passed, 0 failed, 38 unrelated ignored. Changed-file fmt/lint/check passed for 23 TypeScript files and git diff --check passed. verify:fast exit 0: 11 passed, 0 failed, 5 skipped, 2 offline-unavailable. Canonical verification exit 0: 17/17 categories passed. No MAI-112 dependency; no shared platform-job modification; no provider enablement or credentials; no Graphify output. MAI-123 remains In Progress pending human review, integration with merged Wave C work, and Wave C finalization.

Final test-compliance evidence 2026-08-04: branch delivery/MAI-123-notifications-and-subscriptions; PR #46; starting head 1077c3d92f8cad6aa3944e2530e53b306683ec9f. Split tests/notifications/delivery.spec.ts by responsibility into delivery.spec.ts (79 lines, core claim-boundary/unconfigured/disabled behavior), delivery_lease.spec.ts (108 lines, mutable-clock success and three lease-expiry regressions), delivery_failures.spec.ts (78 lines, retry/exhaustion and expiry-before-adapter behavior), and delivery_test_support.ts (359 lines, Notification-owned typed fakes and fixtures). Every resulting delivery test/support file is below 500 lines. All nine existing delivery cases remain present: 3 core, 4 lease, and 2 failure cases; post-adapter lease assertions and truthful attempted-receipt regressions are unchanged. No production code was modified. No MAI-112 dependency, shared platform-job modification, provider enablement or credentials, or Graphify output. Post-split focused delivery suite: 9 passed, 0 failed. Complete Notification/API suite: 36 passed, 0 failed. PostgreSQL: 7 passed, 0 failed, 0 ignored MAI-123 PostgreSQL tests. Concurrency: 2 passed, 0 failed. Append-only evidence: 1 passed, 0 failed. Complete backend: 540 passed, 0 failed, 38 unrelated ignored. Format/lint/check passed for 26 changed TypeScript files; git diff --check passed. verify:fast exit 0: 11 passed, 0 failed, 5 skipped, 2 offline-unavailable. Canonical verification exit 0: 17/17 categories passed. All changed production Notification/API files remain below 500 lines. MAI-123 remains In Progress pending human review and Wave C finalization.

Wave C finisher 2026-08-04: merged PR #46 (b75f3c0) reviewed against the approved plan. Recipient-safe projections, versioned subscriptions, exact-scope idempotency, inbox-deduplicated event consumption, disabled-by-default delivery, retry/expiry/dead-letter receipts, append-only PostgreSQL evidence, and source-domain non-mutation are present; no channel provider was enabled. Fresh isolated PostgreSQL Wave C suite passed 20/20; canonical DENO_ENV=test MAI106_DATABASE_URL=<fresh isolated DB> MAI123_DATABASE_URL=<fresh isolated DB> deno task verify exited 0 with 17/17 categories PASS. Graphify was refreshed once after green verification.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Merged Notifications delivery from PR #46 is final. The Wave C finisher verified plan conformance, recipient isolation, subscription concurrency/idempotency, durable delivery retry/expiry/receipt behavior, isolated PostgreSQL evidence, and the 17-category canonical gate. Graphify refreshed after verification; no provider channel was enabled.
<!-- SECTION:FINAL_SUMMARY:END -->
