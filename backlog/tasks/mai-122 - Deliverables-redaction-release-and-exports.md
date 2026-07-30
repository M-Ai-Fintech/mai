---
id: MAI-122
title: 'Deliverables, redaction, release and exports'
status: To Do
assignee: []
created_date: '2026-07-30 09:29'
labels:
  - backend
  - architecture
  - wave-11
  - mai-85-initiative
  - deliverables
  - security
  - api
  - integration
  - frontend-coordination
milestone: m-12
dependencies:
  - MAI-109
  - MAI-113
  - MAI-114
  - MAI-120
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-events-outbox-inbox-jobs/doc-31 -
    Proposed-ADR-Events-Outbox-Inbox-and-Jobs.md
  - >-
    backlog/docs/decisions/proposed-documents-vdr-object-storage/doc-35 -
    Proposed-ADR-Documents-VDR-and-Object-Storage.md
priority: high
ordinal: 108000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P19

Objective
Deliver draft/version, stale marking, redaction, approval, release and export/distribution jobs with immutable manifests.

Exact scope
Deliverable lifecycle, redaction overlay, human approval/release, recipient scope, export jobs/retries and immutable release manifests.

Explicit exclusions
No provider certification or autonomous release.

Approved dependencies
BE-P08, BE-P10, BE-P11, BE-P17; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-31 through doc-35.

Likely files or subsystems
new `src/deliverables`, adapt generators.

Deliverables
Vertical slice, renderer port and release/recipient/idempotency tests.

Acceptance and verification strategy
Draft-to-approval-to-redaction-to-release-to-export states, stale propagation, recipient scope and retry receipts pass.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Import generated files as historical drafts; migrate objects; release is feature-gated.

Complexity, parallelization and reviews
Extra-large complexity; Wave 11 parallel with BE-P20 through BE-P22. Recommended model: gpt-5.6-sol, High reasoning. Security, frontend and infrastructure reviews required.

Deferred implementation inputs and approval gates
Rendering/export provider selection, credentials and production readiness evidence remain gates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Draft-to-approval-to-redaction-to-release-to-export states, stale propagation, recipient scope and retry receipts pass.
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
