---
id: MAI-113
title: 'Evidence, citations, facts, interpretations, assumptions and calculations'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-30 09:28'
updated_date: '2026-08-05 12:10'
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
Post-merge evidence update:
- Original merged SHA: 679c8137b5117cf4b6ec49cb5d6345c19bc290fb
- Starting SHA for this cleanup: 0b3a229f14c7c5ac9064d827a0375627fecc52d9
- Post-merge correction commits (17 commits):
  1. c94a77a fix(evidence_knowledge): correct post-merge review findings for MAI-113
  2. 6d49bd8 docs: update knowledge graph after MAI-113 correction
  3. 6576f6a docs: append final verification evidence for MAI-113
  4. 40171f6 fix(MAI-113): repair fact current-version migration
  5. 23d10bd fix(MAI-113): preserve fact pointer until supersession
  6. 730eb78 fix(MAI-113): make evidence writes replay-safe
  7. 7a0513f fix(MAI-113): persist complete authorization audit
  8. 1d904f4 test(MAI-113): strengthen postgres lifecycle coverage
  9. 7428d32 chore(MAI-113): restore graph output
  10. 5ce78ea fix(MAI-113): repair current-fact-version pointer migration and enforce deferred constraint
  11. 4313d06 fix(MAI-113): enforce immutable replay and conflict validation on evidence writes
  12. cbedebd fix(MAI-113): normalize rationale and include request identity and session in audit payload
  13. 2e67708 chore(MAI-113): update knowledge graph after post-merge review correction
  14. 1c13cde fix(MAI-113): preserve published migration checksum
  15. 7d489ee fix(MAI-113): enforce fact pointer on history changes
  16. 000a1f9 fix(MAI-113): reject concurrent immutable conflicts
  17. 0b3a229 test(MAI-113): prove complete fact audit rollback
- Migration 0004: Created additive evidence_knowledge-0004 to enforce deferred pointer trigger without altering published 0003.
- Published 0003 checksum preservation: evidence_knowledge-0003.ts restored exactly from commit 7428d32501489bd9278c64524afb30534c889a2f.
- Fact pointer history-consistency results: Direct transition-history inserts superseding current version without updating Fact row fail at transaction commit via deferred trigger trg_assert_fact_current_version_valid.
- Concurrent Citation replay results: 2 concurrent ops with identical Citation payload both succeed, storing 1 Citation row.
- Concurrent Evidence replay results: 2 concurrent ops with identical Evidence payload both succeed, storing 1 Citation row and 1 Evidence row.
- Concurrent conflict results: 2 concurrent ops with conflicting payloads result in 1 winner success and 1 deterministic error (payload changed; expected immutable replay).
- Audit field assertions: Verified all 20 field-level audit values (actor ID, identity ID, session ID, origin, correlation ID, policy decision ID, authority snapshot ID, policy version, actor kind, before/after aggregate version, before/after Fact status, previous/resulting current Fact Version ID, citation evidence references, normalized rationale, outcome, audit occurredAt, evidence snapshot capturedAt).
- Audit rollback results: Forced audit failure rolls back transaction atomically with 0 partial rows across history, provenance, invalidation, idempotency, outbox, and audit.
- PID-specific Fact-command concurrency result: Concurrent transitions on same Fact locked via SELECT FOR UPDATE result in 1 winner success and 1 deterministic VersionConflictError.
- Graphify restoration: graphify-out/GRAPH_REPORT.md and graphify-out/graph.json restored byte-identical to baseline 679c8137b5117cf4b6ec49cb5d6345c19bc290fb.
- Focused MAI-113 test counts: 30 passed, 0 failed across 8 focused specs.
- Documents test counts: 29 passed, 0 failed across 9 specs.
- Audit Activity test counts: 23 passed, 0 failed across 6 specs.
- Wave C PostgreSQL counts: 130 passed, 0 failed across 38 specs (Evidence Knowledge 49, Documents 29, Audit Activity 23, Notifications 29).
- Complete backend counts: 664 passed, 0 failed, 1 ignored (exit 0).
- verify:fast result: 11 passed, 0 failed, 5 skipped, 2 unavailable (exit 0).
- Canonical 17/17 result: 17/17 categories passed (exit 0).
- Files over 400 lines: All files verified strictly under 500 lines.
- Confirmation no new PR was created.

MAI-113 remains In Progress pending final human data-model, security, architecture, API-contract, and Wave D completion review.
<!-- SECTION:NOTES:END -->
