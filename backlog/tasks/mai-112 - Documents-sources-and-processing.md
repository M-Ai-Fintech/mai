---
id: MAI-112
title: 'Documents, sources and processing'
status: Done
assignee:
  - '@codex'
created_date: '2026-07-30 09:28'
updated_date: '2026-08-04 11:17'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - documents
  - persistence
  - migration
  - integration
  - api
  - frontend-coordination
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
    backlog/docs/decisions/proposed-postgresql-schema-transactions/doc-28 -
    Proposed-ADR-PostgreSQL-Schema-and-Transaction-Strategy.md
  - >-
    backlog/docs/decisions/proposed-concurrency-versioning/doc-30 -
    Proposed-ADR-Concurrency-and-Aggregate-Versioning.md
  - >-
    backlog/docs/decisions/proposed-audit-evidence-provenance/doc-32 -
    Proposed-ADR-Audit-Evidence-Versioning-and-Provenance.md
  - >-
    backlog/docs/decisions/proposed-documents-vdr-object-storage/doc-35 -
    Proposed-ADR-Documents-VDR-and-Object-Storage.md
modified_files:
  - src/documents/ids.ts
  - src/documents/model.ts
  - src/documents/version.ts
  - src/documents/source.ts
  - src/documents/processing.ts
  - src/documents/v1.ts
  - src/documents/migrations/documents_0001.ts
  - src/documents/migrations/index.ts
  - src/documents/repository.ts
  - src/documents/repository_sql.ts
  - src/documents/repository_rows.ts
  - src/documents/checksum.ts
  - src/documents/object_store.ts
  - src/documents/source_provider.ts
  - src/documents/source_sync.ts
  - src/documents/upload.ts
  - src/documents/jobs.ts
  - src/documents/retry.ts
  - src/documents/processing_worker.ts
  - src/documents/events.ts
  - src/documents/composition.ts
  - src/api/v1/documents.ts
  - src/api/v1/documents_routes.ts
  - src/platform/jobs/model.ts
  - src/platform/jobs/repository.ts
  - src/platform/jobs/repository_sql.ts
  - src/platform/jobs/repository_validation.ts
  - src/platform/jobs/worker.ts
  - tests/documents/model.spec.ts
  - tests/documents/migration.spec.ts
  - tests/documents/repository_postgres.spec.ts
  - tests/documents/source_sync.spec.ts
  - tests/documents/processing.spec.ts
  - tests/documents/processing_lease.spec.ts
  - tests/documents/processing_isolation.spec.ts
  - tests/documents/processing_worker_postgres.spec.ts
  - tests/documents/composition_postgres.spec.ts
  - tests/api/v1/documents.spec.ts
  - tests/platform/jobs/model.spec.ts
  - tests/platform/jobs/repository_postgres.spec.ts
  - tests/platform/jobs/repository_filter_postgres.spec.ts
  - tests/platform/jobs/worker.spec.ts
  - tests/platform/jobs/worker_process.spec.ts
priority: high
ordinal: 30100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P09

Objective
Deliver Document, Version, Source and Processing Run aggregates with immutable provenance and durable processing jobs.

Exact scope
Upload negotiation, checksum/version provenance, source/provider ports, object references, processing/retry/isolation and API/read models.

Explicit exclusions
No provider production certification, evidence approval or frontend adapter cutover.

Approved dependencies
BE-P03, BE-P04, BE-P06, BE-P08; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-28, doc-30 through doc-32, doc-35.

Likely files or subsystems
new `src/documents`, VDR adapters and jobs.

Deliverables
Document vertical slice, named fakes and processing/retry/isolation tests.

Acceptance and verification strategy
Document versions are immutable; upload/sync/process retries are idempotent; storage/VDR and tenant/workspace/deal leakage tests pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Exclusive document migration ownership; import metadata/binaries/checksums and dual index; rollback source adapter while retaining objects.

Complexity, parallelization and reviews
Extra-large complexity; Wave 5 parallel with BE-P07. Recommended model: gpt-5.6-sol, High reasoning. Security, data-model, frontend and infrastructure reviews required.

Deferred implementation inputs and approval gates
Object storage/VDR provider selection, credentials and production readiness evidence are required gates before any provider is certified.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Document versions are immutable; upload/sync/process retries are idempotent; storage/VDR and tenant/workspace/deal leakage tests pass.
- [x] #2 Scope, exclusions, required ADRs, approval gates and review requirements are reflected in implementation evidence.
- [x] #3 No unauthorized backend/frontend/Figma redesign or production-provider certification is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Wave C execution plan — MAI-112

### Outcome and constraints

Deliver the provider-neutral Documents vertical slice: tenant/workspace/deal-scoped Document, immutable Document Version, Document Source, object reference, and Processing Run contracts; upload negotiation and source synchronization; checksum/version provenance; and durable idempotent processing jobs. A VDR remains a source system, binary storage remains a project-owned port, and no downloaded runtime file becomes authoritative truth. MAI-112 remains **To Do** during planning; the Luna implementation run may move it to In Progress and must leave it there for human review and the Wave C finisher.

### Governing evidence and boundaries

- doc-24 maps BE-P09 to MAI-112 and requires immutable versions; idempotent upload, sync, and processing; tenant/workspace/deal leakage coverage; exclusive document/object/vector migration ownership until MAI-110 reindex; metadata/binary/checksum import and dual index; and source-adapter rollback with objects retained.
- doc-28 requires a documents-owned PostgreSQL schema, additive forward-only migration with explicit forward/rollback notes, one context owner, reconciliation before cutover, and no cross-context table ownership.
- doc-30 requires atomic monotonic aggregate versions, ETag/If-Match for material commands, actor-command-target scoped idempotency, immutable appended versions, and jobs that recheck referenced versions.
- doc-31 requires transactional outbox/inbox and durable Job/JobAttempt records for upload, sync, download, checksum, storage, and processing; consumers are idempotent, retries/dead letters visible, and side effects retain command/job/audit/outbox trails.
- doc-32 requires immutable versions, exact hashes/object locations, append-only provenance and supersession/invalidation links; generated output is not transaction truth.
- doc-35 requires tenant-scoped Connector Accounts, capability discovery, normalized provider errors/cursors/exact provider versions, versioned object storage, derived/versioned artifacts, and no production-ready provider claim without environment-specific evidence.
- Existing `src/core/vdr/**`, `tests/vdr_*.spec.ts`, and `src/api/routes/engines_documents.ts` are migration inputs only. MAI-112 must not rewrite MVP routes, GUI clients, or provider configuration; MAI-125 owns final frontend adapter migration, MAI-127 owns provider certification, and MAI-129 owns final compatibility retirement.

### Ordered exclusive implementation slices

1. **Document-domain contracts (exclusive: `src/documents/model.ts`, `src/documents/ids.ts`, `src/documents/version.ts`, `src/documents/source.ts`, `src/documents/processing.ts`, `src/documents/v1.ts`).** Define branded identifiers and explicit tenant/workspace/deal scope; immutable DocumentVersion records with source identity, provider marker, checksum, classification, and object reference; DocumentSource and connector-account reference contracts; processing-run state/provenance; typed normalized provider failures and capabilities. Validate required metadata without fabricated provider IDs or timestamps.
2. **Owned persistence and migration (exclusive: `src/documents/migrations/documents_0001.ts`, `src/documents/migrations/index.ts`, `src/documents/repository.ts`, `src/documents/repository_sql.ts`, `src/documents/repository_rows.ts`).** Create only the `documents` context schema and indexes. Persist append-only versions, source cursors, object references, processing runs, idempotency keys, and provenance scoped by tenant/workspace/deal; use transaction/version fences and protected-not-found reads. Register the context migration through the task-owned composition only; do not alter platform or Deal Management migration registries.
3. **Project-owned object/source ports and sync workflow (exclusive: `src/documents/object_store.ts`, `src/documents/source_provider.ts`, `src/documents/source_sync.ts`, `src/documents/upload.ts`, `src/documents/checksum.ts`).** Define project-owned object-store and DocumentSourceProvider ports, named fake implementations, capability discovery, normalized cursor/error mapping, upload negotiation, streamed checksum/object-reference creation, and duplicate-source/version detection. Adapt legacy VDR providers only behind this boundary; do not certify Papermark, iDeals, Intralinks, or any other provider.
4. **Durable processing workflow (exclusive: `src/documents/jobs.ts`, `src/documents/processing_worker.ts`, `src/documents/events.ts`, `src/documents/retry.ts`).** Initiate sync/upload/process effects transactionally with MAI-106 outbox/jobs primitives; consume provider events through inbox deduplication; recheck exact DocumentVersion inputs before processing; record attempts, retry/timeout/cancellation/dead-letter outcomes, and versioned derived artifacts. Use deterministic actor-command-target idempotency keys and preserve objects/history on retry or rollback.
5. **Additive composition/API boundary after slices 1–4 pass (exclusive: `src/documents/composition.ts`, `src/api/v1/documents.ts`, `src/api/v1/documents_routes.ts`).** Compose the documents repository, named fakes, and disabled-by-default source/object adapters. Expose only authorized v1 metadata/read and semantic upload/sync/process commands with opaque pagination, ETag/If-Match, idempotency, and durable-job references. Do not change `src/api/server.ts`, `src/api/mvp_routes.ts`, `src/api/routes/engines_documents.ts`, GUI schemas, or frontend behavior without an owner-approved cross-task integration decision.
6. **Regression, migration, and rollback proof (exclusive: `tests/documents/model.spec.ts`, `tests/documents/repository_postgres.spec.ts`, `tests/documents/source_sync.spec.ts`, `tests/documents/processing.spec.ts`, `tests/documents/migration.spec.ts`, `tests/api/v1/documents.spec.ts`).** Use named fake clock, authorization port, connector-account resolver, object store, source provider, outbox/inbox repository, durable job repository, and worker. Prove immutability, checksum/source provenance, scope isolation and protected-not-found behavior, stale/duplicate/replayed upload-sync-process work, retry/dead-letter/restart recovery, exact-version rechecks, migration apply/import/reconciliation, dual-index comparison, and retention-safe adapter rollback.

### Verification, rollout, rollback, and gates

- Focused checks: `deno fmt --check src/documents tests/documents src/api/v1/documents.ts src/api/v1/documents_routes.ts`; focused Deno document/API-v1 tests using repository permissions; PostgreSQL repository/migration suites only in an approved environment; then `git diff --check`.
- Canonical gate: `DENO_ENV=test deno task verify` to terminal completion. A timeout, unavailable dependency, skipped PostgreSQL suite, or interruption is non-passing and must be recorded separately from focused passing evidence.
- Rollout: apply the additive documents migration; inventory/import existing VDR fixture metadata, binaries, and checksums as explicit sources; reprocess and build a dual index; compare scoped reads/provenance before enabling a source adapter. Keep all provider/object adapters disabled until data-model and security review, approved provider/credentials, staging conformance/recovery evidence, infrastructure approval, and explicit owner approval.
- Rollback: disable the documents source/object/processing adapter and return to the prior read adapter while retaining Document/Version rows, object references and binaries, source cursors, jobs/attempts, inbox/outbox, audit/provenance, migration ledger, and reconciliation manifest. Never overwrite versions, delete durable evidence, or claim physical schema rollback after durable data; reconcile before another cutover.
- Review gates: data-model and architecture review before schema/app composition; security review for tenant/workspace/deal isolation, provider credentials, object access, and protected-not-found behavior; infrastructure approval for storage/residency/retention and recovery; frontend coordination only for a separately approved later adapter; explicit owner approval before PR publication, merge, provider enablement/certification, Backlog Done, or production-readiness claims.

### Explicit exclusions, dependencies, and collision checkpoints

- Excluded: provider production certification, credentials/secrets, environment readiness, evidence approval, direct RAG/vector authority, frontend/Figma/GUI changes, MVP route replacement, generic document CRUD, lifecycle state changes, notification delivery, and data-retirement/cutover.
- Start checkpoint: re-read MAI-106, MAI-107, MAI-109, and MAI-110 status and executable contracts; MAI-112 cannot begin until every declared dependency is Done. Before every slice, re-read MAI-112 plus active MAI-111 and MAI-123 plans; stop for owner direction if any shared migration registry, platform primitive, server router, MVP route, or dependency behavior must change.
- MAI-111 plans `src/deal_lifecycle`, Deal APIs, and workflow tests; MAI-112 uses deal IDs only as scoped references and must not modify lifecycle state, `src/deal_management/**`, or its composition. MAI-123 plans `src/notifications/**` and `src/api/v1/notifications*`; MAI-112 must not create notification events/consumers or modify those paths. Current peer branches have no source diff, so the present risk is planned shared wiring rather than an existing file collision.
- Shared collision-risk paths are `src/platform/{persistence,events,jobs}/**`, `src/api/server.ts`, `src/api/mvp_routes.ts`, `src/api/routes/engines_documents.ts`, `src/core/vdr/**`, and any central migration/runtime registration. They are deliberately not planned MAI-112 modifications; obtain an owner-assigned integration slice if a dependency requires one.

PR #47 blocker-correction plan (approved by the explicit correction request): (1) trace the v1 process command, durable DocumentJob payload, worker exact-version recheck, and existing tests; add immutable authorized document/version identity and deny-before-object/processor/artifact regressions for document and full tenant/workspace/deal scope; (2) make source-page accounting explicit so cursor advancement requires all items to be durably created or recognized duplicates, with retry-safe failed-item evidence and page retry regressions; (3) derive job and operation IDs from complete tenant/workspace/deal/actor/command/document/idempotency/payload identity and add PostgreSQL replay/isolation/collision regressions; (4) extend the shared platform PostgreSQL claim contract with optional non-empty allowed job types, preserve unfiltered behavior, filter inside FOR UPDATE SKIP LOCKED, and use the filter in the Documents worker with mixed-queue PostgreSQL regressions; (5) run focused, platform, PostgreSQL, verify:fast, complete backend, and canonical verification, then update the existing Draft PR and Backlog without merge or Done.

PR #47 lease-fencing correction (approved 2026-08-04): add one `beforeExternalEffect()` assertion immediately before authoritative `artifacts.append()` in `src/documents/processing_worker.ts`, preserving the existing exact-version, cancellation, timeout, and job-type checks.

Regression seam: add named lease-controlled execution context, object-store observer, processor observer, and artifact sink tests under `tests/documents/processing_lease.spec.ts`; prove the successful sequence has three assertions and one append, while deterministic lease loss during processor execution causes the third assertion to reject and leaves the artifact sink empty. No sleeps or wall-clock timing.

Verification and handoff: run focused processing/Documents/platform-job suites, scoped format/lint/type/diff checks, `deno task verify:fast`, relevant PostgreSQL suites, and canonical `DENO_ENV=test deno task verify`; append exact results to MAI-112, commit as `fix(MAI-112): fence derived artifact persistence`, push the existing branch, update Draft PR #47, and retain In Progress/Draft/Open/Unmerged/Unapproved governance.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Papermark adapter migration boundary

1. MAI-112 owns the project-level Document Source and Document Version contracts used by VDR adapters.

2. Provider-specific code implements the project-owned `DocumentSourceProvider` port rather than defining document-domain truth.

3. A Papermark source connection references a tenant-scoped Connector Account and explicit provider/source identity.

4. Sync and ingestion record:
   - provider workspace or data-room identity;
   - provider document identity;
   - folder or hierarchy identity where available;
   - cursor or continuation state;
   - source version or update marker;
   - checksum supplied by the provider or calculated by MAI;
   - immutable Document Version;
   - object-store reference;
   - processing state;
   - exact failure state.

5. Sync, upload negotiation, download, checksum, storage, and processing use idempotent durable jobs.

6. Downloaded files are not authoritative merely because they exist in a local runtime directory.

7. `./vdr_rooms/[dealId]` is not the target binary-storage authority.

8. Missing provider metadata is explicit and must not be replaced with fabricated identifiers or timestamps.

9. Provider implementation and environment certification remain under MAI-127.

10. Existing adapter code remains migration evidence until the new contracts and consumers exist.

VDR source integration ownership boundary

1. MAI-112 owns provider-neutral document-source contracts, immutable Document Versions, source synchronization, object references, and durable processing.

2. A VDR is a source system and is not authoritative Deal, evidence, transaction, or document-domain truth.

3. Each provider connection uses a tenant-scoped Connector Account.

4. Source synchronization uses:
   - explicit capabilities;
   - provider workspace identity;
   - normalized cursors;
   - idempotent durable jobs;
   - normalized errors;
   - source-version information;
   - checksums;
   - immutable Document Versions;
   - object-store references.

5. No provider may directly initialize an authoritative RAG silo.

6. No provider may silently overwrite a Document Version.

7. Named fixture adapters may prove internal contracts but cannot satisfy provider certification.

Intake 2026-08-03: confirmed isolated worktree /home/luis/mai-worktrees/wave_c/MAI-112 on delivery/MAI-112-documents-sources-and-processing at 003d1d8, with the pre-existing governed task-file change preserved and no source changes. MAI-106, MAI-107, MAI-109, and MAI-110 are Done dependencies; MAI-111 and MAI-123 remain To Do with no current source diff. The approved Wave C execution plan is present locally and in this task. Prompt boundary applied: no Graphify, provider certification, frontend/Figma/MVP cutover, shared migration registry, or production-readiness claim.

Slice 1 complete: added provider-neutral branded document/source/connector/object/run/artifact identifiers; explicit tenant/workspace/deal scope; immutable DocumentVersion with checksum/object/source provenance; DocumentSource and connector-account references; processing-run and derived-artifact contracts; normalized provider capabilities/errors. Red/green evidence: deno check src/documents/v1.ts tests/documents/model.spec.ts, focused model suite 4 passed/0 failed, deno fmt applied, git diff --check exit 0. No provider IDs or timestamps are synthesized.

Slice 2 complete in source: added documents-0001 additive documents-owned migration with scoped documents/sources/object references/immutable versions/processing/derived artifacts/provenance/idempotency tables, indexes, and four append-only evidence triggers; added SQL repository, row hydration, scope-protected reads, append/version fence, source cursor optimistic update, and processing persistence. Focused non-PostgreSQL evidence: deno fmt/check passed, 5 document/model+migration tests passed, git diff --check exit 0. PostgreSQL migration/repository tests were collected but 3 tests were ignored because MAI106_DATABASE_URL was not configured; this remains a required environment gate, not a pass.

Slice 3 complete: added streamed byte collection/SHA-256 checksums; project-owned ObjectStore port and named FakeObjectStore with versioned references/retention-safe reads; DocumentSourceProvider port, named fake, capability discovery, normalized provider errors and explicit missing metadata; upload negotiation/completion with duplicate source/version detection; source sync with provider cursor advancement and retry-safe outcomes. Evidence: deno check passed, focused document suites 9 passed/0 failed, 3 PostgreSQL tests ignored because MAI106_DATABASE_URL remains unavailable, deno fmt and git diff --check passed. No legacy VDR provider or local directory was made authoritative.

Slice 4 complete in source: added typed documents durable job inputs for upload, sync, download, checksum, storage, and processing; actor-command-target idempotency derivation; transactional job plus outbox scheduling; exact docver input rechecks before object reads and artifact writes; named processing executor/worker seams; exponential retry and sanitized provider/stale/processing failures; and inbox-deduplicated provider event consumption with replay after failure. Evidence: deno fmt/check passed, processing suite 5 passed/0 failed, and git diff --check passed. No provider was enabled or certified.

Slice 5 complete: added task-owned DocumentsComposition with platform plus documents migration exposure, PostgreSQL repository/read adapter, deterministic transactional job/outbox scheduler with platform idempotency replay, named fake object/source ports, and adaptersEnabled=false by default. Added isolated /api/v1 documents metadata/list and upload/sync/process route contracts with protected authorization, opaque cursors, strong ETags/If-Match, deterministic actor-command-target idempotency, validation, stale-version errors, and accepted durable-job envelopes. Evidence: focused API-v1 suite 4 passed/0 failed; documents suites 14 passed/0 failed/3 ignored for unavailable PostgreSQL; deno fmt/check and git diff --check passed. Server/MVP/GUI/provider paths remain unchanged.

Verification correction and terminal evidence (2026-08-03): current processing regression suite is 4 passed/0 failed (the earlier slice note said 5 before the final file-size cleanup; inbox/job scheduling coverage remains in the provider-event test), and current API-v1 suite is 5 passed/0 failed. Focused document suites are 14 passed/0 failed/3 ignored without MAI106_DATABASE_URL; with the approved isolated PostgreSQL URL postgres://postgres:postgres@localhost:55432/mai_test_mai106, documents migration plus repository PostgreSQL suites passed 4/4. Full backend command `DENO_ENV=test MAI106_DATABASE_URL=postgres://postgres:postgres@localhost:55432/mai_test_mai106 deno task test` completed 543 passed, 0 failed, 1 ignored (the existing live-agent smoke test).

Canonical gate terminal evidence: `DENO_ENV=test deno task verify` completed successfully under elevated execution after GUI dependencies were installed with `npm --prefix gui ci --no-audit --no-fund`; all 16 stages passed, including Deno, GUI unit tests, Next production build, principal workflows, Storybook build, and Storybook interaction tests. The initial sandbox attempt's localhost EPERM was an environment limitation and was not treated as passing evidence.

Final scope check: `deno fmt --check` checked 28 files, `deno lint src/documents src/api/v1 tests/documents tests/api/v1` checked 29 files, selected `deno check` passed, and `git diff --check` passed. No shared server/MVP/platform/legacy-VDR/GUI source changes were introduced; adapters remain disabled by default; no provider certification, production-readiness, evidence approval, merge, or Backlog Done claim is made. MAI-112 remains In Progress for human data-model/security/infrastructure review and owner approval.

Draft handoff: commit c8f66db (`documents: add provider-neutral vertical slice`) was pushed to delivery/MAI-112-documents-sources-and-processing and opened as draft PR #47 targeting master. The PR contains the 29 scoped source/test files only; the governed Backlog task record is not committed. PR remains Draft for human data-model, security, infrastructure, and owner review. MAI-112 remains In Progress; no merge, self-approval, provider enablement/certification, production-readiness, or Done transition.

Correction intake 2026-08-04: PR #47 has no connector-visible comments or review threads; the owner supplied four verified blockers. Expected branch head c8f66dba303a6f22024ab0956f42b63113c22f8d confirmed. Parallel boundary retained: no MAI-111/MAI-123 branch content, no Notifications files, no rebase/cherry-pick, no Graphify.

Correction implementation evidence 2026-08-04: bound Document processing jobs to an immutable authorized documentId plus tenant/workspace/deal/version identity; worker exact-version recheck rejects same-deal cross-document and cross-scope references before object-store, processor, or artifact effects. Source synchronization now advances only when every item is created or a durable duplicate; invalid metadata and provider/upload/storage failures remain retryable at the current cursor. Durable job and operation identifiers now hash tenant/workspace/deal/actor/command/document/idempotency/payload identity. Shared platform claims accept an optional non-empty allowedJobTypes filter inside FOR UPDATE SKIP LOCKED; existing unfiltered callers remain supported, and the Documents worker filters documents.process.

Verification evidence 2026-08-04: focused Documents tests 23 passed/0 failed/0 ignored; API documents tests 5 passed/0 failed; platform-jobs tests 16 passed/0 failed with the filtered PostgreSQL claim test included; MAI-112 PostgreSQL tests 11 passed/0 failed/0 ignored; mixed-queue PostgreSQL tests 2 passed/0 failed; complete backend deno task test 551 passed/0 failed/1 unrelated ignored live-agent smoke test; verify:fast exit 0 with 11 passed/0 failed, 5 skipped, and 2 unavailable by its documented offline manifest; canonical DENO_ENV=test deno task verify exited 0 with 17/17 categories passed. All changed TypeScript files pass scoped deno fmt --check, deno lint, deno check, and git diff --check. Repository-wide fmt/lint commands were also run and reported pre-existing governed Markdown/AGENTS and unrelated GUI/source findings outside this change; no unrelated files were modified.

Governance remains unchanged: MAI-112 stays In Progress; PR #47 remains Draft/Open/Unmerged/Unapproved; no MAI-111, MAI-123, Notifications, GUI/Figma, provider credentials/certification, destructive migration, Graphify run, approval, or merge was performed.

Lease-fencing implementation 2026-08-04: `DocumentProcessingExecutor.execute()` now asserts `beforeExternalEffect()` immediately before `DerivedArtifactSink.append()`, preserving the load/validate, pre-read, and pre-processor fences. The named `LeaseController`, lease-observing object store and processor, and recording artifact sink in `tests/documents/processing_lease.spec.ts` deterministically prove the successful three-fence/one-append sequence and lease expiration during processor execution before the final assertion.

Red/green evidence: before the production fence, the two new lease tests failed (successful path observed 2 assertions instead of 3; expiry path did not reject). After the one-line correction, `deno test --allow-read --allow-write --allow-env --allow-net --allow-run tests/documents/processing_lease.spec.ts tests/documents/processing.spec.ts tests/documents/processing_isolation.spec.ts` passed 7/7 with 0 failures; the stale-version and cross-document/scope regressions remain passing.

Lease-fencing final evidence 2026-08-04: commit `de76fae93beecbdb963e0c58acdbf1d4d509b545` (`fix(MAI-112): fence derived artifact persistence`) pushed fast-forward to `delivery/MAI-112-documents-sources-and-processing` from remote head `29b7d3e6f98c2fc4577b1d42c9f091d8f14dad73`. The commit changes only `src/documents/processing_worker.ts`, `tests/documents/processing.spec.ts`, and `tests/documents/processing_lease.spec.ts`.

Lease regressions: focused processing/worker set passed 7/7 (4 existing processing, 2 new lease-fence cases, 1 exact-version isolation); the success case observed assertions before object read and processor invocation at counts 1 and 2, then completed the third assertion and appended exactly once. The deterministic processor-expiry case caused the final `beforeExternalEffect()` to reject with `LEASE_LOST`; `DerivedArtifactSink.append()` was called 0 times and retained 0 authoritative artifacts. Existing stale-version and cross-document/tenant/workspace/deal isolation regressions passed.

Relevant suite evidence: all Documents specs passed 25/25 (19 non-PostgreSQL plus 6 PostgreSQL); Documents API tests passed 5/5; all platform-job specs passed 16/16 (10 non-PostgreSQL plus 6 PostgreSQL); mixed-queue PostgreSQL coverage passed 2/2 (Documents worker and filtered claim). MAI-112-required PostgreSQL coverage passed 11/11 with 0 ignored tests. Complete backend `DENO_ENV=test MAI106_DATABASE_URL=postgres://postgres:postgres@localhost:55432/mai_test_mai106 deno task test` passed 553, failed 0, with 1 unrelated pre-existing ignored live-agent smoke test.

Static/canonical evidence: changed-file `deno fmt --check`, `deno lint`, `deno check src/documents/processing_worker.ts`, `deno check tests/documents/processing_lease.spec.ts`, and `git diff --check` passed. The exact repository-wide `deno fmt --check` exited 1 with 697 pre-existing unformatted files and repository-wide `deno lint` exited 1 with 23 pre-existing GUI/source findings outside this correction; no unrelated files changed. `deno task verify:fast` exited 0 with 11 passed, 0 failed, 5 skipped, 2 unavailable under its documented offline manifest. Canonical `DENO_ENV=test MAI106_DATABASE_URL=postgres://postgres:postgres@localhost:55432/mai_test_mai106 deno task verify` exited 0 with 17/17 categories passed.

Governance/handoff: MAI-112 remains In Progress. PR #47 remains Draft/Open/Unmerged/Unapproved; no approval, merge, ready-state mutation, sibling Wave C code, shared platform-job change, Graphify run, or Graphify file is included. The commit hook regenerated Graphify outputs; they were restored before publication.

Evidence count clarification appended 2026-08-04: the complete Documents inventory is 25 passed/0 failed/0 ignored, consisting of 20 non-PostgreSQL tests (including the static migration-contract test) and 5 PostgreSQL tests. The platform-job inventory is 16 passed/0 failed, consisting of 10 non-PostgreSQL and 6 PostgreSQL tests; the combined MAI-112-required PostgreSQL count remains 11 passed/0 failed/0 ignored.

Final-review synchronization evidence (2026-08-04): branch delivery/MAI-112-documents-sources-and-processing; PR #47; current origin/master used: 11da22c146ba83f91cb3bec9f518e15d582cad18; synchronization commit: 7e8b200b8715f1ce7b9f15e3e63c19312a2deeb6 (Merge remote-tracking branch 'origin/master' into delivery/MAI-112-documents-sources-and-processing). The merge was clean; it incorporated only merged MAI-111 Deal Management content and did not modify MAI-112 source/test files or incorporate MAI-123.

Post-sync lease-fencing evidence: de76fae93beecbdb963e0c58acdbf1d4d509b545 remains unchanged. DocumentProcessingExecutor preserves three ordered beforeExternalEffect assertions: before object-store read, before processor invocation, and immediately before authoritative artifacts.append(). The successful-path regression observed all three assertions in order and appended exactly once. The deterministic lease-loss regression rejects with LEASE_LOST after processor draft production; artifacts.append() was called zero times and no derived artifact became authoritative. Exact-version and cross-document/tenant/workspace/deal isolation regressions remain passing. processing_lease.spec.ts is governed in the modified-file inventory.

Exact post-sync verification on isolated PostgreSQL mai_test_mai106 at localhost:55434: focused processing set (processing.spec.ts, processing_lease.spec.ts, processing_isolation.spec.ts, processing_worker_postgres.spec.ts) passed 8/8 with 0 failures; complete Documents suite passed 25/25 with 0 failures and 0 ignored (20 non-PostgreSQL plus 5 PostgreSQL); Documents API passed 5/5; complete platform-jobs suite passed 16/16 with 0 failures (10 non-PostgreSQL plus 6 PostgreSQL); filtered-claim PostgreSQL passed 1/1; mixed-queue PostgreSQL passed 2/2; MAI-112 required PostgreSQL coverage passed 11/11 with 0 ignored; complete backend deno task test passed 572, failed 0, with 1 unrelated pre-existing ignored live-agent smoke test; scoped deno fmt --check and deno lint checked 45 files successfully; deno check src/documents/processing_worker.ts passed; deno check tests/documents/processing_lease.spec.ts passed; git diff --check passed; deno task verify:fast exited 0 with 11 passed, 0 failed, 5 skipped, and 2 documented offline-unavailable categories; canonical DENO_ENV=test MAI106_DATABASE_URL=postgres://postgres:postgres@localhost:55434/mai_test_mai106 deno task verify exited 0 with 17/17 categories passed.

Scope/governance evidence: exact-version authorization binding, retry-safe source cursor handling, complete durable-job identity, backward-compatible filtered claiming, and the third artifact-persistence lease fence are preserved. No MAI-123 dependency or content, Notifications modification, provider enablement/credentials, GUI/Figma modification, or Graphify output was introduced. MAI-112 remains In Progress pending human data-model, security, infrastructure, and merge review and Wave C finalization. PR #47 remains Draft/Open/Unmerged/Unapproved.

Wave C finisher 2026-08-04: merged PR #47 (65ee190) reviewed against the approved plan. Provider-neutral Documents ownership, immutable versions/provenance, exact-scope authorization, source cursor/idempotency, durable processing/retries, lease-fenced artifact persistence, migration/rollback retention, and disabled-by-default adapters are present; no provider certification was introduced. Fresh isolated PostgreSQL Wave C suite passed 20/20; canonical DENO_ENV=test MAI106_DATABASE_URL=<fresh isolated DB> MAI123_DATABASE_URL=<fresh isolated DB> deno task verify exited 0 with 17/17 categories PASS. Graphify was refreshed once after green verification.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Merged Documents delivery from PR #47 is final. The Wave C finisher verified plan conformance, bounded provider-neutral ownership, immutable provenance and isolation behavior, durable processing/lease fencing, isolated PostgreSQL evidence, and the 17-category canonical gate. Graphify refreshed after verification; no provider was enabled or certified.
<!-- SECTION:FINAL_SUMMARY:END -->
