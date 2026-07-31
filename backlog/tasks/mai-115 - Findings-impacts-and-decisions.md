---
id: MAI-115
title: 'Findings, impacts and decisions'
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
updated_date: '2026-07-31 21:16'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - diligence
  - decisions
  - provenance
  - api
  - delivery-wave-f
milestone: m-12
dependencies:
  - MAI-113
  - MAI-114
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
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
priority: high
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P12

Objective
Deliver Finding/Impact proposals, approval/invalidation and Decision Request with immutable Decision Record and basis versions.

Exact scope
Findings/impact aggregate commands, evidence version linkage, human decision records, projections and audit.

Explicit exclusions
No valuation, shortlist or closing-specific calculations; no AI-owned decision.

Approved dependencies
BE-P10, BE-P11; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-26, doc-30, doc-32, doc-33.

Likely files or subsystems
new `src/diligence_decisions`.

Deliverables
Commands, projections, audit and supersession tests.

Acceptance and verification strategy
Findings and decisions preserve evidence versions and immutable human actor; invalidation never rewrites a decision.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Import only supported findings as proposed; legacy decisions require authority evidence.

Complexity, parallelization and reviews
High complexity; Wave 8 follows BE-P10/BE-P11. Recommended model: gpt-5.6-sol, High reasoning. Data-model review required.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Findings and decisions preserve evidence versions and immutable human actor; invalidation never rewrites a decision.
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
VDR completeness and missing-document finding boundary

1. Document-completeness checks produce proposed Findings, not automatic compliance conclusions.

2. Every completeness result references:
   - checklist or rule-set version;
   - exact Document Versions evaluated;
   - missing expected document categories;
   - unavailable or inaccessible sources;
   - evaluation timestamp;
   - actor or automated producer;
   - provenance.

3. The presence or absence of a folder or tag is not by itself a legal, financial, tax, regulatory, or compliance conclusion.

4. A missing document is not automatically a deal-breaker.

5. Findings remain proposed until reviewed through the approved Finding and Decision lifecycle.

6. Approval, invalidation, waiver, risk acceptance, and final disposition remain human decisions.

7. Re-evaluation creates a new version or superseding Finding rather than rewriting prior evidence.
<!-- SECTION:NOTES:END -->
