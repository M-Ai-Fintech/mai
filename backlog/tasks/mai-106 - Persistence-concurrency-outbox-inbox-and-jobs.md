---
id: MAI-106
title: 'Persistence, concurrency, outbox, inbox and jobs'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-30 09:28'
updated_date: '2026-07-30 13:20'
labels:
  - backend
  - architecture
  - wave-2
  - mai-85-initiative
  - persistence
  - migration
  - security
  - jobs
milestone: m-12
dependencies:
  - MAI-104
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-postgresql-schema-transactions/doc-28 -
    Proposed-ADR-PostgreSQL-Schema-and-Transaction-Strategy.md
  - >-
    backlog/docs/decisions/proposed-concurrency-versioning/doc-30 -
    Proposed-ADR-Concurrency-and-Aggregate-Versioning.md
  - >-
    backlog/docs/decisions/proposed-events-outbox-inbox-jobs/doc-31 -
    Proposed-ADR-Events-Outbox-Inbox-and-Jobs.md
modified_files:
  - src/platform/persistence/v1.ts
  - src/platform/persistence/migration.ts
  - src/platform/persistence/migration_runner.ts
  - src/platform/persistence/transaction.ts
  - src/platform/persistence/concurrency.ts
  - src/platform/persistence/idempotency.ts
  - src/platform/persistence/migrations.ts
  - src/platform/persistence/migrations/platform_0001_idempotency.ts
  - src/platform/persistence/migrations/platform_0002_outbox.ts
  - src/platform/persistence/migrations/platform_0003_inbox.ts
  - src/platform/persistence/migrations/platform_0004_jobs.ts
  - src/platform/events/v1.ts
  - src/platform/events/outbox.ts
  - src/platform/events/dispatcher.ts
  - src/platform/events/inbox.ts
  - src/platform/jobs/v1.ts
  - src/platform/jobs/model.ts
  - src/platform/jobs/repository.ts
  - src/platform/jobs/repository_sql.ts
  - src/platform/jobs/repository_validation.ts
  - src/platform/jobs/worker.ts
  - tests/platform/support/postgres.ts
  - tests/platform/persistence/migration.spec.ts
  - tests/platform/persistence/migration_postgres.spec.ts
  - tests/platform/persistence/transaction.spec.ts
  - tests/platform/persistence/concurrency.spec.ts
  - tests/platform/persistence/concurrency_postgres.spec.ts
  - tests/platform/persistence/idempotency.spec.ts
  - tests/platform/persistence/idempotency_postgres.spec.ts
  - tests/platform/events/dispatcher.spec.ts
  - tests/platform/events/outbox_postgres.spec.ts
  - tests/platform/events/inbox_postgres.spec.ts
  - tests/platform/jobs/model.spec.ts
  - tests/platform/jobs/repository_postgres.spec.ts
  - tests/platform/jobs/worker.spec.ts
priority: high
ordinal: 92000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P03

Objective
Establish the durable persistence, concurrency, event and job primitives owned by the platform.

Exact scope
Context migration framework, transaction runner, aggregate versions, idempotency records, durable jobs/attempts, transactional outbox, inbox dispatcher and named fakes.

Explicit exclusions
No business-context tables, provider transport, production deployment configuration or feature handlers.

Approved dependencies
BE-P01; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-28, doc-30, doc-31.

Likely files or subsystems
`src/core/db`, new `src/platform/{persistence,events,jobs}`.

Deliverables
Foundational migrations, repositories, worker protocol and recovery tests.

Acceptance and verification strategy
Concurrent updates lose safely; idempotent replay is stable; outbox/jobs survive restart; inbox deduplicates; recovery tests pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Exclusive migration ownership; additive foundation then worker enablement; rollback worker/dispatcher while retaining durable rows.

Complexity, parallelization and reviews
Extra-large complexity; Wave 2 serial database owner. Recommended model: gpt-5.6-sol, High reasoning. Data-model and security reviews required.

Deferred implementation inputs and approval gates
Final RLS scope plus production RPO/RTO values are acceptance gates; production infrastructure selection is not authorized here.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Concurrent updates lose safely; idempotent replay is stable; outbox/jobs survive restart; inbox deduplicates; recovery tests pass.
- [x] #2 Scope, exclusions, required ADRs, approval gates and review requirements are reflected in implementation evidence.
- [x] #3 No unauthorized backend/frontend/Figma redesign or production-provider certification is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Migration framework: define the versioned persistence seam, owner-scoped ordered migrations, checksum and exclusive-lock rules; add the initial additive platform migration and red/green pure plus PostgreSQL tests.
2. Transaction and concurrency: add an injected one-connection transaction runner with lifecycle/failure semantics and future scope metadata hook; prove optimistic fixture updates through AggregateVersion boundaries.
3. Idempotency and events: implement deterministic digests, durable claim/replay/conflict behavior, transactional outbox storage, publisher port, dispatcher claims/leases/retries/dead letters, and durable inbox deduplication.
4. Durable jobs: implement validated states, append-only attempts, cancellation, timeout, retry/dead-letter/requeue behavior, input-version and future audit contracts, plus bounded worker execution and recovery protocols.
5. Recovery verification: use the isolated mai_test_mai106 PostgreSQL database, recreated repositories/connections, crash-before/after-commit cases, focused pure/database tests, scoped format/lint, canonical and live integration gates.
6. Review and handoff: run one compact read-only data/security audit, correct only material P0/P1 findings, update Backlog evidence/files, create focused commits, push only this branch, and open one Draft PR without merging or marking Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Execution intake 2026-07-30: dedicated worktree /home/luis/mai-worktrees/mai-106; exact branch feat/MAI-106-persistence-concurrency-outbox-inbox-jobs; starting SHA 9986b368ea7a0f1ce15d96345feb505197b7c17a; clean at intake. MAI-104 confirmed Done/merged; MAI-106 had only MAI-104 dependency; no competing MAI-106 local/remote branch, commit, or PR. Baseline run exactly once before implementation: deno task verify exit 1. Passed canonical docs, i18n, Deno tests, tokens, components, shell, screens, deal screens, execution screens, conformance, Storybook docs. Pre-existing environment failures: frontend foundation could not spawn git under sandbox (EPERM); GUI packages vitest, next, playwright and storybook were absent. No project source had been mutated.

Implemented four additive owner-scoped platform migrations: platform-0001-idempotency, platform-0002-outbox, platform-0003-inbox, and platform-0004-jobs. Final isolated database: mai_test_mai106 on the task-scoped PostgreSQL Compose service at localhost port 55432; platform schema is owned only by MAI-106 and contains migration_ledger, idempotency_records, outbox, inbox, jobs, and tenant-scoped append-only job_attempts. No credentials were recorded.

Final implementation evidence: versioned public entrypoints src/platform/persistence/v1.ts, src/platform/events/v1.ts, and src/platform/jobs/v1.ts; injected transaction runner; optimistic tenant/id/expected-version updates; digest-fenced idempotency; attempt/lease-fenced outbox and jobs; tenant-scoped inbox; validated job state machine; typed publisher, executor, input-version, future-scope, and future-audit ports. Rollout remains additive and disabled/test-only; rollback stops consumers/workers/dispatchers and retains all durable rows.

Verification evidence: final git diff --check exit 0; scoped deno fmt --check 35 files exit 0; scoped deno lint 35 files exit 0; final focused pure and PostgreSQL suite 35 passed, 0 failed, exit 0. Baseline deno task verify was run exactly once before implementation and exited 1 for sandbox GUI git EPERM and missing GUI packages. Final deno task verify exited 1 after 215 tests plus 11 steps: all MAI-106 and all frontend gates passed; four legacy TransactionRepository steps failed because the isolated database intentionally lacks prototype tables transaction_type, transaction, and phase. deno task verify:integration exited 1 before live calls because real GEMINI_API_KEY, PAPERMARK_API_KEY, and PAPERMARK_ROOM_ID were unavailable; no mocks or placeholder certification used.

Final combined read-only data-model/security review: initial audit found 0 P0 and 6 P1 (migration input validation, idempotency digest fencing, outbox lease-attempt fencing, job lease-attempt fencing, tenant-scoped attempt history, post-execution timeout persistence). The coordinator corrected exactly those material findings and added regressions. Final coordinator recheck confirms 0 open P0/P1; migration ownership and atomicity, tenant/workspace/deal scope, concurrency/idempotency/lease races, append-only attempts, restart recovery, dead-letter visibility, sanitization, and retention-safe rollback are evidenced. No business table, RLS policy, provider transport, external broker, authz import, or MVP cutover was introduced.
<!-- SECTION:NOTES:END -->
