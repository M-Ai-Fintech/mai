---
id: MAI-127
title: Integration adapters and certification
status: To Do
assignee: []
created_date: '2026-07-30 09:29'
labels:
  - backend
  - architecture
  - wave-12
  - mai-85-initiative
  - integration
  - security
  - infrastructure
  - api
milestone: m-12
dependencies:
  - MAI-107
  - MAI-112
  - MAI-118
  - MAI-120
  - MAI-122
  - MAI-123
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
    backlog/docs/decisions/proposed-agent-human-authority/doc-34 -
    Proposed-ADR-Agent-Execution-and-Human-Authority.md
  - >-
    backlog/docs/decisions/proposed-documents-vdr-object-storage/doc-35 -
    Proposed-ADR-Documents-VDR-and-Object-Storage.md
priority: high
ordinal: 113000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P24

Objective
Implement and configure approved IdP, object store, VDR, AI, embedding, inference, conversion/OCR, communication and webhook adapters with capability/health evidence.

Exact scope
Provider adapter ports, credentials boundary, capability discovery, conformance/sandbox/failure/health/residency tests and readiness register.

Explicit exclusions
No production-verified label without environment-specific tests and no unapproved provider.

Approved dependencies
BE-P04, BE-P09, BE-P15, BE-P17, BE-P19, BE-P20; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-27, doc-31, doc-34, doc-35.

Likely files or subsystems
provider adapter packages and integration tests.

Deliverables
Conformance/sandbox suites, readiness register and operator docs.

Acceptance and verification strategy
Each enabled adapter passes conformance, sandbox/failure/health/residency tests and readiness evidence; unsupported capability is denied.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Provider-by-provider rollout/credential rotation; rollback adapter/capability flag.

Complexity, parallelization and reviews
Extra-large complexity; Wave 12 adapters may parallelize internally. Recommended model: gpt-5.6-sol, High reasoning for security; gpt-5.6-terra, High reasoning for mechanical adapters. Credentials and infrastructure reviews required.

Deferred implementation inputs and approval gates
Concrete providers, credentials, data-residency decisions and production readiness evidence are mandatory gates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each enabled adapter passes conformance, sandbox/failure/health/residency tests and readiness evidence; unsupported capability is denied.
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
