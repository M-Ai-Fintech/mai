---
id: MAI-112
title: 'Documents, sources and processing'
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
labels:
  - backend
  - architecture
  - wave-5
  - mai-85-initiative
  - documents
  - persistence
  - migration
  - integration
  - api
  - frontend-coordination
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
priority: high
ordinal: 98000
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
- [ ] #1 Document versions are immutable; upload/sync/process retries are idempotent; storage/VDR and tenant/workspace/deal leakage tests pass.
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
