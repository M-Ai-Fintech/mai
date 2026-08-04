---
id: MAI-113
title: 'Evidence, citations, facts, interpretations, assumptions and calculations'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-30 09:28'
updated_date: '2026-08-04 19:59'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - evidence
  - provenance
  - security
  - persistence
  - api
  - frontend-coordination
  - delivery-wave-d
milestone: m-12
dependencies:
  - MAI-112
references:
  - 'https://github.com/luisfelipeluis49/mai/pull/49'
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-bounded-contexts-aggregate-ownership/doc-26
    - Proposed-ADR-Bounded-Contexts-and-Aggregate-Ownership.md
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
  - src/api/v1/evidence_knowledge.ts
  - src/api/v1/evidence_knowledge_routes.ts
  - src/evidence_knowledge/assumption.ts
  - src/evidence_knowledge/calculation.ts
  - src/evidence_knowledge/citation.ts
  - src/evidence_knowledge/citation_service.ts
  - src/evidence_knowledge/composition.ts
  - src/evidence_knowledge/document_version_verification.ts
  - src/evidence_knowledge/events.ts
  - src/evidence_knowledge/fact.ts
  - src/evidence_knowledge/fact_command_repository.ts
  - src/evidence_knowledge/fact_commands.ts
  - src/evidence_knowledge/fact_version_status.ts
  - src/evidence_knowledge/freshness.ts
  - src/evidence_knowledge/ids.ts
  - src/evidence_knowledge/interpretation.ts
  - src/evidence_knowledge/invalidation.ts
  - src/evidence_knowledge/invalidation_repository.ts
  - src/evidence_knowledge/migrations/evidence_knowledge_0001.ts
  - src/evidence_knowledge/migrations/index.ts
  - src/evidence_knowledge/model.ts
  - src/evidence_knowledge/provenance.ts
  - src/evidence_knowledge/repository.ts
  - src/evidence_knowledge/repository_rows.ts
  - src/evidence_knowledge/repository_sql.ts
  - src/evidence_knowledge/v1.ts
  - src/evidence_knowledge/vector_port.ts
  - src/evidence_knowledge/vector_projection.ts
  - tests/api/v1/evidence_knowledge.spec.ts
  - tests/evidence_knowledge/calculation_provenance_postgres.spec.ts
  - tests/evidence_knowledge/composition_postgres.spec.ts
  - tests/evidence_knowledge/document_version_verification.spec.ts
  - tests/evidence_knowledge/fact_command_postgres.spec.ts
  - tests/evidence_knowledge/fact_commands.spec.ts
  - tests/evidence_knowledge/invalidation.spec.ts
  - tests/evidence_knowledge/invalidation_lease_postgres.spec.ts
  - tests/evidence_knowledge/lineage.spec.ts
  - tests/evidence_knowledge/migration.spec.ts
  - tests/evidence_knowledge/model.spec.ts
  - tests/evidence_knowledge/repository_postgres.spec.ts
  - tests/evidence_knowledge/vector_isolation.spec.ts
priority: high
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P10

Objective
Deliver exact-version evidence and citation, facts, interpretations, assumptions and calculation records with targeted freshness invalidation.

Exact scope
Evidence validation, approved/superseded facts, provenance/lineage, vector-port isolation and stale-source propagation.

Explicit exclusions
No valuation model, generic RAG endpoint, AI approval or cross-deal retrieval.

Approved dependencies
BE-P09; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-26, doc-30 through doc-32, doc-35.

Likely files or subsystems
new `src/evidence_knowledge`, vector port and projections.

Deliverables
Vertical slice, lineage graphs and stale/leakage tests.

Acceptance and verification strategy
Evidence binds to exact source; approved facts are immutable or superseded; targeted staleness/invalidation and vector isolation pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Rebuild embeddings using a versioned index; no legacy memory becomes a fact; rollback query adapter.

Complexity, parallelization and reviews
Extra-large complexity; Wave 6 serial after documents. Recommended model: gpt-5.6-sol, High reasoning. Data-model and security reviews required.

Deferred implementation inputs and approval gates
Embedding provider, data residency and model/prompt retention choices remain explicit implementation gates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Evidence binds to exact source; approved facts are immutable or superseded; targeted staleness/invalidation and vector isolation pass.
- [ ] #2 Scope, exclusions, required ADRs, approval gates and review requirements are reflected in implementation evidence.
- [ ] #3 No unauthorized backend/frontend/Figma redesign or production-provider certification is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Wave D execution plan — MAI-113

### Outcome and authority

Deliver the BE-P10 Evidence Knowledge vertical slice as a new, owned
`src/evidence_knowledge` bounded context. It records immutable, exact-version
evidence citations; approved facts and append-only supersessions; proposed
interpretations and assumptions; immutable calculation inputs/results; and
targeted stale propagation. It exposes only scope- and authorization-protected
read/command contracts. Documents remains the owner of Document and Document
Version truth; VectorIndex is a derived, replaceable projection, never source
truth. This implements doc-24 BE-P10 under doc-26, doc-30, doc-31, doc-32,
and doc-35, after MAI-112's merged Documents contracts.

### Start gates and invariants

1. Reconfirm MAI-112 is Done/merged and MAI-113 is In Progress before code;
   retain this local plan outside the PR and keep MAI-113 In Progress through
   human review. Re-read MAI-113, doc-24, and ADRs 26, 30, 31, 32, and 35.
2. Every owned record carries tenant/workspace/Deal scope. Evidence citation
   references the exact immutable `DocumentVersionId`, checksum, location or
   artifact, classification, processing version, and freshness state.
   Authorization is checked before metadata, excerpt, citation, or vector
   candidate is returned. Cross-scope, classification, or permission mismatch
   returns an explicit protected/not-found or forbidden state without leakage.
3. Facts have explicit proposed/approved/superseded status and immutable
   approved versions. Interpretations and assumptions are distinct proposed
   records, not facts. Calculations capture exact input references, formula or
   algorithm version, output, and provenance; MAI-113 does not implement a
   valuation model or make model output authoritative.
4. Material commands use ETag/If-Match and actor-command-target idempotency;
   stale referenced versions, payload mismatch, concurrent approval or
   supersession preserve history and report deterministic conflicts. State
   transitions atomically persist audit/idempotency/outbox evidence; consumers
   are idempotent and recheck source versions before effects.
5. An index key includes tenant, workspace, Deal, Document Version,
   classification, processing version, and index version. Reindexing creates a
   new index version; source supersession/invalidation marks only dependent
   projections/results stale. No shared index with filters as the isolation
   mechanism, no in-memory/local-file fallback, and no generic query endpoint.

### Ordered exclusive implementation slices

1. **Owned language and pure aggregate contracts** — exclusively add
   `src/evidence_knowledge/ids.ts`, `model.ts`, `citation.ts`, `fact.ts`,
   `interpretation.ts`, `assumption.ts`, `calculation.ts`, `provenance.ts`,
   `freshness.ts`, and `v1.ts`; add
   `tests/evidence_knowledge/model.spec.ts` and
   `tests/evidence_knowledge/lineage.spec.ts`. Establish branded IDs,
   scopes, exact Document Version citation locations/checksums, immutable
   snapshots, valid category/state transitions, lineage graph traversal, and
   explicit stale/missing/inaccessible states. Do not edit Documents-owned
   types or legacy `src/agent/rag/**`.
2. **Persistence and concurrency** — exclusively add
   `src/evidence_knowledge/migrations/evidence_knowledge_0001.ts`,
   `migrations/index.ts`, `repository.ts`, `repository_sql.ts`,
   `repository_rows.ts`, and `composition.ts`; add
   `tests/evidence_knowledge/migration.spec.ts`,
   `repository_postgres.spec.ts`, and `composition_postgres.spec.ts`.
   Use an additive `evidence_knowledge` schema with context-owned tables for
   citations/evidence, fact versions, interpretations, assumptions,
   calculations, provenance links, invalidation records, idempotency, and
   versioned index metadata. Enforce scope foreign references, append-only
   immutable rows/triggers, aggregate versions, scoped indexes, optimistic
   concurrency, and retention-safe rollback notes. Register only this
   context-owned migration stream; do not change the shared platform or
   Documents migration registries.
3. **Derived vector projection and targeted invalidation** — exclusively add
   `src/evidence_knowledge/vector_port.ts`, `vector_projection.ts`,
   `invalidation.ts`, and `events.ts`; add
   `tests/evidence_knowledge/vector_isolation.spec.ts` and
   `invalidation.spec.ts`. Define a project-owned vector port with named fake
   implementation; persist/rebuild per-version projections and consume
   idempotent source/fact invalidation events through the existing outbox/inbox
   and durable-job seams. Prove reindex replaces a derived version without
   rewriting evidence, stale propagation is dependency-targeted, retries and
   duplicate delivery are safe, and T/W/D/classification/permission leakage is
   impossible. Keep all real provider adapters disabled.
4. **Narrow API/application composition** — exclusively add
   `src/api/v1/evidence_knowledge.ts`, `evidence_knowledge_routes.ts`, and
   `tests/api/v1/evidence_knowledge.spec.ts`. Provide a limited exact-ID
   evidence/citation/fact/calculation read surface and explicit authorized
   command inputs only where the approved contract requires them; enforce
   authorization before loading, opaque identifiers, ETag/If-Match,
   idempotency, safe errors, freshness visibility, and accepted durable-job
   envelopes. Do not wire the new routes into the executable server until the
   owning runtime composition and authorization provider are intentionally
   available; do not add a generic RAG/retrieval endpoint or frontend adapter.
5. **Integration evidence and handoff** — exclusively extend
   `tests/evidence_knowledge/` with end-to-end lineage reconstruction,
   concurrent writer/replay/mismatch/stale-reference, job retry/dead-letter,
   and PostgreSQL isolation coverage; update only MAI-113 through Backlog with
   exact evidence. Run focused format/lint/check/test commands first, then
   `DENO_ENV=test deno task verify` to terminal completion. Record passed,
   skipped, unavailable, and failed checks separately; open a Draft PR for
   human data-model and security review, without merge or Done transition.

### Planned file ownership and collision controls

Primary code and tests are new task-owned `src/evidence_knowledge/**`,
`tests/evidence_knowledge/**`, `src/api/v1/evidence_knowledge.ts`,
`src/api/v1/evidence_knowledge_routes.ts`, and
`tests/api/v1/evidence_knowledge.spec.ts`. The expected collision surfaces are
`src/platform/**` (shared persistence/events/jobs/API contracts),
`src/documents/**` (MAI-112-owned exact version contracts), executable server
composition, legacy `src/agent/rag/**`, and GUI adapters. MAI-113 consumes
their public contracts only. If a required shared seam is missing, stop and
request an owner-approved follow-up rather than expanding scope or modifying
another task's files.

### Focused and canonical verification

Run `deno fmt --check` and `deno lint` on the planned source/test paths,
`deno check src/evidence_knowledge/v1.ts`, `deno check
src/api/v1/evidence_knowledge.ts`, and `git diff --check`. Run focused Deno
tests with the repository's scoped permissions for
`tests/evidence_knowledge/model.spec.ts`, `lineage.spec.ts`,
`vector_isolation.spec.ts`, `invalidation.spec.ts`, and the API contract test.
With an approved isolated PostgreSQL URL, run migration, repository, and
composition PostgreSQL specs plus Documents cross-context exact-version
regressions. Then run `DENO_ENV=test deno task verify`; a timeout, ignored
required database test, missing dependency, or interrupted command is
non-passing and is recorded as such.

### Migration, rollout, and rollback

Apply only the additive Evidence Knowledge migration after backing up its
schema/migration-ledger evidence in the approved environment. Inventory legacy
memory/vector rows with source quality; import none as approved facts. Build
versioned indexes from authorized immutable Document Versions, reconcile
counts/checksums/scope keys and lineage, then enable the query adapter behind
an explicit feature gate. Roll back by disabling the adapter and consumers and
returning reads to the prior approved adapter while retaining append-only
records, objects, index metadata, audit/outbox/job evidence, and migration
ledger; never delete history as rollback. Rebuild a new index version for a
correction rather than mutating an existing projection.

### Approval, provider, residency, risks, and reviews

Before any embedding/OCR/vector provider call, credential addition, data
egress, index enablement, or non-test adapter configuration, obtain written
owner, security, infrastructure, and data-governance approval for provider,
regional/data-residency placement, classification/permission policy,
retention/legal hold, prompt/model-input retention, encryption/key ownership,
recovery/restore, and environment conformance. Named fakes prove internal
contracts only and are not provider certification or production readiness.
Checkpoint after each slice: confirm no Documents ownership violation, no
cross-scope leak, no legacy-memory promotion, no unapproved shared-file edit,
and exact Backlog evidence. Required human reviews: data-model (truth
categories and supersession), security (T/W/D/classification/permission and
residency), architecture (bounded-context/event/vector boundary), and API
contract review before any route/runtime wiring.

### Explicit exclusions

No valuation model; generic RAG/search endpoint; AI approval/decision;
cross-Deal retrieval; provider credential/configuration/certification;
production-readiness claim; Documents/VDR/object-store ownership change;
legacy local-memory migration as fact; frontend, GUI, route-ownership, or
Figma redesign; shared-platform migration edits; Graphify; self-approval,
merge, or MAI-113 Done transition.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Agent document-retrieval boundary

1. Agent and application retrieval always references an exact Document Version and source location.

2. Tenant, institution, workspace, Deal, classification, permission, and evidence authorization checks occur before document content, chunks, or vector results are loaded.

3. Vector indexes are derived, versioned, replaceable projections and are not authoritative document truth.

4. Retrieval results identify:
   - Document ID;
   - Document Version ID;
   - source or provider;
   - object or source location;
   - checksum;
   - processing version;
   - index version;
   - evidence freshness or staleness state.

5. No generic, unscoped `query_silo` capability is part of the target architecture.

6. Missing, inaccessible, unprocessed, stale, or unsupported evidence returns an explicit state.

7. Missing evidence must not be replaced by fixture, mock, local-file, or process-memory content in a configured real-provider flow.

8. MAI-113 owns evidence retrieval and citation semantics, not provider credentials or agent registration.

VDR-derived evidence and index boundary

1. Evidence always binds to exact Document Versions rather than generic VDR filenames or provider folders.

2. Vector indexes are derived projections keyed by tenant, workspace, Deal, Document Version, classification, processing version, and index version.

3. Vector or chunk results are not authoritative source truth.

4. Reprocessing or reindexing creates a new derived version.

5. Provider synchronization failure, stale processing, unavailable indexes, and inaccessible source content remain explicit.

6. No shared vector index with filter-only isolation is permitted.

7. Retrieval cannot cross tenant, workspace, Deal, classification, or permission boundaries.

Slice 1 complete: added immutable exact Document Version references, citations, evidence/fact/calculation contracts, freshness states, and cycle-safe lineage. Focused command: DENO_ENV=test deno test --allow-read --allow-env tests/evidence_knowledge/model.spec.ts tests/evidence_knowledge/lineage.spec.ts -> 5 passed, 0 failed.

Slices 2-4 complete: added owned evidence_knowledge migration/repository/composition, optimistic fact status transition seam, versioned vector port/projection, receipt-port-backed targeted invalidation events, and narrow exact-ID authorized API routes. Focused checks: deno check and deno lint on task paths passed; DENO_ENV=test deno test with model, lineage, migration, vector, invalidation, repository PostgreSQL, composition, and API specs -> 12 passed, 0 failed, 1 ignored (repository PostgreSQL ignored because mai106DatabaseUrl() is unavailable). No provider, runtime server, frontend, Graphify, or shared migration registry changes.

Canonical verification: DENO_ENV=test deno task verify reached terminal completion non-passing with 572 Deno tests passed, 5 pre-existing MAI-123 PostgreSQL tests failed because MAI123_DATABASE_URL is unset, and 45 tests ignored. GUI dependency absence was resolved with npm --prefix gui ci --no-audit --no-fund (555 packages added). Post-install GUI evidence: npm --prefix gui run test:unit -> 34 files, 92 passed; npm --prefix gui run lint -> passed; npm --prefix gui run build -> passed; npm --prefix gui run verify:workflows with localhost approval -> passed; npm --prefix gui run build-storybook -> passed; npm --prefix gui run test-storybook with localhost approval -> 27 files, 133 passed. Scoped final gates: deno fmt --check -> 30 files checked; deno lint -> 30 files checked; deno check src/evidence_knowledge/v1.ts src/api/v1/evidence_knowledge.ts -> passed; git diff --check -> passed. PostgreSQL MAI-113 repository spec remains ignored because no approved isolated database URL is configured. Task remains In Progress pending canonical PostgreSQL evidence, human data-model/security/architecture/API review, and Draft PR review.

Draft PR #49 opened through the connected GitHub repository API because local commit/push was blocked by the linked worktree read-only shared Git metadata (index.lock under /home/luis/mai/.git/worktrees/MAI-113). Remote commit cdf0d124456011bd4432c41cee1cbc8ca55cab4d contains 31 MAI-113-scoped files. PR remains Draft/Open/Unmerged/Unapproved; MAI-113 remains In Progress.

Draft handoff metadata follow-up committed remotely as 7f004cd4504d253d990a2d89197418ee190b8516 after adding the PR reference to the governed task record. GitHub confirms PR #49 head 7f004cd, Draft/Open/Unmerged, 31 changed files, 2 commits.

Correction pass for PR #49, based on expected starting head 7f004cd4504d253d990a2d89197418ee190b8516. Added Evidence-owned exact Document Version verification adapter and VerifiedCitationWriter; invalid sources fail before persistence with protected outcomes. Replaced permanent invalidation claim with acquire/complete/releaseAfterFailure lifecycle, durable PostgreSQL receipt seam, and scope/source-kind target matching. Added scoped relational tables and foreign keys for evidence/citations, fact versions/citations, interpretations/evidence, calculation inputs, transition history, invalidation receipts, append-only triggers, and classification-aware full vector index identity. Added atomic fact command authorization/idempotency contract and repository normalization for fact citations and calculation inputs. Focused correction verification: deno fmt --check, deno lint, deno check v1/composition/API, and git diff --check passed; MAI-113/API focused run 20 passed, 0 failed, 1 ignored (PostgreSQL repository test unavailable without an isolated MAI106 database URL). deno task verify:fast passed 11/11 included categories, with 5 skipped and 2 unavailable by offline manifest. Full backend reached terminal completion with 580 passed, 5 failed, 45 ignored; failures are existing MAI123 PostgreSQL tests because MAI123_DATABASE_URL is unset. Canonical verify reached terminal completion non-passing: Deno test failure from the same five MAI123 PostgreSQL configuration failures; frontend principal workflows and Storybook interaction test were unavailable/non-passing under restricted local listen permissions. No Documents, platform, provider, frontend source, runtime-server, or Graphify files changed. MAI-113 remains In Progress pending isolated PostgreSQL evidence and human data-model, security, architecture, API-contract, merge review, and Wave D finalization.

Correction evidence (2026-08-04): branch delivery/MAI-113-evidence-citations-facts-interpretations-assumptions-and-calculations, correction commits pending publication after bb7f781. Exact Document Version verification uses an Evidence Knowledge-owned port and public Documents read seam; invalid scope, tenant, Deal, checksum, classification, missing, stale, and protected sources are rejected before citation persistence. Focused MAI-113 suite with isolated PostgreSQL: 22 passed, 0 failed, 0 ignored. PostgreSQL repository regressions cover orphan and cross-scope evidence links, invalid supersession, append-only UPDATE rejection, classification-complete index identity, and duplicate-key rejection. Atomic fact command evidence persists idempotency, history, provenance, targeted invalidation, and outbox atomically; exact replay returns prior result. Invalidation retries after failure and matches tenant/workspace/Deal/source kind/source ID. Documents PostgreSQL suites: 6 passed. Merged Wave C PostgreSQL matrix: 36 passed across 16 suites. Complete backend: 630 passed, 0 failed, 1 unrelated live-E2E ignored; exit 0. verify:fast: 11 passed, 0 failed, 5 skipped, 2 unavailable; exit 0. Canonical deno task verify: exit 0, 17/17 categories passed. No provider, frontend, runtime-server, shared-platform, Documents-owned, or Graphify files changed. MAI-113 remains In Progress pending human data-model, security, architecture, API-contract, and merge review and Wave D finalization.

Final-correction implementation in progress: added explicit expectedAggregateVersion comparison and guarded update, effective Fact Version status resolver with transition sequence, composed VerifiedEvidenceWritePort with authorization-before-verification and uniform protected outcomes, lease-based invalidation owner tokens/expiry/reclaim, and transaction-scoped calculation provenance validation for evidence/fact_version/interpretation/assumption inputs. Added PostgreSQL regressions for stale commands, complete Fact Version lifecycle, calculation rollback/input kinds, and stale invalidation owner fencing. Static checks pass for 41 scoped files; non-PostgreSQL focused run is 22 passed, 0 failed, 4 PostgreSQL tests ignored because the sandbox rejects the required elevated database execution. MAI-113 remains In Progress; no PR publication or completion claim until PostgreSQL, backend, verify:fast, and canonical gates rerun after synchronization.
<!-- SECTION:NOTES:END -->
