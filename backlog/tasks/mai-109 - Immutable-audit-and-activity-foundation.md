---
id: MAI-109
title: Immutable audit and activity foundation
status: In Progress
assignee: []
created_date: '2026-07-30 09:28'
updated_date: '2026-08-02 01:35'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - audit
  - security
  - persistence
  - api
  - delivery-wave-a
milestone: m-12
dependencies:
  - MAI-105
  - MAI-106
references:
  - 'https://github.com/luisfelipeluis49/mai/pull/39'
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
  - >-
    backlog/docs/decisions/proposed-audit-evidence-provenance/doc-32 -
    Proposed-ADR-Audit-Evidence-Versioning-and-Provenance.md
modified_files:
  - src/audit_activity/access.ts
  - src/audit_activity/export_job.ts
  - src/audit_activity/migrations/audit_0001_events_and_redactions.ts
  - src/audit_activity/migrations/index.ts
  - src/audit_activity/model.ts
  - src/audit_activity/projection.ts
  - src/audit_activity/repository.ts
  - src/audit_activity/transaction.ts
  - src/audit_activity/v1.ts
  - tests/audit_activity/access_export.spec.ts
  - tests/audit_activity/migration.spec.ts
  - tests/audit_activity/model.spec.ts
  - tests/audit_activity/projection.spec.ts
  - tests/audit_activity/support.ts
  - tests/audit_activity/transaction.spec.ts
priority: high
ordinal: 10200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P08

Objective
Deliver append-only Audit Event storage, Activity Projection and deterministic reconstruction/redaction-overlay rules.

Exact scope
Immutable audit records, projection rebuilds, audited export access, correlation and actor/provenance linkage.

Explicit exclusions
No mutable audit history, domain-specific decisions, generic activity CRUD or production retention infrastructure.

Approved dependencies
BE-P02, BE-P03; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-28, doc-30, doc-31, doc-32.

Likely files or subsystems
new `src/audit_activity`, persistence/events/projections.

Deliverables
Append-only store, deterministic rebuild and audit-access tests.

Acceptance and verification strategy
Audit is append-only; redaction is an overlay; projections rebuild deterministically; export access is audited.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Begin dual audit before slice cutovers; rebuild projections; never rollback or delete audit history.

Complexity, parallelization and reviews
Extra-large complexity; Wave 3 parallel with BE-P04 and BE-P05. Recommended model: gpt-5.6-sol, High reasoning. Security and data-model reviews required.

Deferred implementation inputs and approval gates
Production RPO/RTO and retention operating inputs are explicit approval gates; no production infrastructure is selected by this task.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Audit is append-only; redaction is an overlay; projections rebuild deterministically; export access is audited.
- [ ] #2 Scope, exclusions, required ADRs, approval gates and review requirements are reflected in implementation evidence.
- [ ] #3 No unauthorized backend/frontend/Figma redesign or production-provider certification is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preserve MAI-104/105/106 contracts and read doc-24 plus docs 27, 28, 30, 31 and 32; keep the isolated domain boundary and defer shared API/router integration until MAI-107 is merged and this branch is rebased.
2. Add src/audit_activity contracts, append-only repository port/implementation, authority and evidence snapshots, redaction overlay storage, and an additive audit-owned migration without changing MAI-106 migration or outbox files.
3. Add a transaction-scoped audited transition writer that appends audit and existing outbox records on the same TransactionHandle, with regression coverage for append-only enforcement and atomic failure behavior.
4. Add deterministic activity projection rebuilds with explicit position watermarks, redaction overlays, classification/access filtering, and named fake-based replay tests.
5. Add an authorization-gated export-job boundary that enqueues only opaque scoped inputs and appends an audited export-request event; do not select or certify providers, register /api/v1 routes, import history, or add mutation paths.
6. Run focused audit_activity checks, format/lint/diff checks, and deno task verify; record the MAI-107 rebase gate and any environment-limited evidence before PR handoff.
7. Tighten the audit payload contract to reject non-JSON values and prove nested special-value rejection, deep record/array support, and digest stability after freezing and JSON persistence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reapplied after the post-MAI-107 task-record conflict during rebase: MAI-105 and MAI-106 are Done; the isolated branch is delivery/MAI-109-immutable-audit-and-activity. Required docs 27, 28, 30, 31, 32 and doc-24 were read. No MAI-107/MAI-106-owned files, shared router/API routes, GUI, Figma, historical import, SIEM certification, or provider certification were added. Focused DENO_ENV=test deno test --env --allow-read tests/audit_activity/*.spec.ts passed 15/15; deno fmt and deno lint passed; deno task test passed 273 with 0 failures and 21 ignored. deno task verify exited 1 only on environment-bound GUI gates: frontend foundation spawnSync git EPERM, and missing vitest, next, playwright, and storybook. Remote PR #36 confirms MAI-107 merged; fetch succeeded and rebase is being completed now.

Post-rebase evidence: after MAI-107 PR #36 merged, `git fetch origin` succeeded and `git rebase origin/master` completed; the only conflict was the governed MAI-109 task record and it was resolved through Backlog CLI. `origin/master` is bdecd20528cb3ae4b17256f09ecb1169cfe03306, rebased HEAD is eb6c80c, and merge-base ancestry check passed. Focused DENO_ENV=test audit_activity tests passed 15/15; `deno check src/audit_activity/v1.ts`, `deno fmt --check`, `deno lint`, and `git diff --check` passed. Post-rebase `deno task test` passed 319 with 0 failures and 22 ignored. Post-rebase `deno task verify` exited 1 only on environment-bound GUI gates: frontend foundation spawnSync git EPERM, and missing vitest, next, playwright, and storybook; canonical docs, i18n, Deno tests, design tokens, component/shell/screen/Figma checks and Storybook docs passed. MAI-109 remains In Progress pending draft-PR owner review; no API routes/shared router seams, MAI-107/MAI-106-owned files, GUI/Figma work, history import, mutation path, provider certification, or SIEM certification were added.

Draft PR #39 is open for owner review at https://github.com/luisfelipeluis49/mai/pull/39. The branch was pushed after the required MAI-107 rebase; MAI-109 remains In Progress and no merge, self-approval, or Done transition was performed.

Payload-freezing correction: replaced generic object freezing with recursive strict JSON-compatible normalization. AuditPayload now rejects nested Date, undefined, functions, symbols, Map/Set/custom instances, nonfinite numbers, sparse/invalid arrays, symbol keys, and non-data properties; finite values and plain nested records/arrays are sorted, cloned, frozen, and -0 is canonicalized to 0. The same normalized payload drives digest calculation, PostgreSQL JSON serialization, stored-event freezing, and projection output. TDD evidence: the pre-fix regression loop was red (5 new rejection cases failed); after the fix focused DENO_ENV=test audit_activity tests passed 22/22, including nested payload projection and digest equality after freezing plus JSON persistence. Typecheck, deno fmt --check, deno lint, and git diff --check passed. Updated full deno task test passed 326 with 0 failures and 22 ignored. Updated deno task verify exited 1 only on the known environment-bound GUI gates: frontend foundation spawnSync git EPERM, and missing vitest, next, playwright, and storybook; canonical documentation, i18n, Deno tests, design tokens, component/shell/screen/Figma checks, and Storybook documentation passed. PR #39 remains Draft/In Review pending owner action; MAI-109 remains In Progress.
<!-- SECTION:NOTES:END -->
