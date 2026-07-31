---
id: MAI-113
title: 'Evidence, citations, facts, interpretations, assumptions and calculations'
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
updated_date: '2026-07-31 20:09'
labels:
  - backend
  - architecture
  - wave-6
  - mai-85-initiative
  - evidence
  - provenance
  - security
  - persistence
  - api
  - frontend-coordination
milestone: m-12
dependencies:
  - MAI-112
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
priority: high
ordinal: 99000
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
1. Re-read doc-24, required ADRs and real task dependencies.
2. Obtain listed review/approval gates before irreversible or provider-facing work.
3. Implement only the exact bounded scope with named fakes and focused tests.
4. Execute task-specific and canonical verification, record migration/rollout/rollback evidence, then hand off.
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
<!-- SECTION:NOTES:END -->
