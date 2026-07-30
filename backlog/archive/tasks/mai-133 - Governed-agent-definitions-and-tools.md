---
id: MAI-133
title: Governed agent definitions and tools
status: To Do
assignee: []
created_date: '2026-07-30 09:29'
updated_date: '2026-07-30 09:31'
labels:
  - backend
  - architecture
  - wave-11
  - mai-85-initiative
  - agent-architecture
  - security
  - integration
milestone: m-12
dependencies:
  - MAI-116
  - MAI-117
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-agent-human-authority/doc-34 -
    Proposed-ADR-Agent-Execution-and-Human-Authority.md
priority: high
ordinal: 119000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P18

Objective
Adapt eight agents, schemas and pure engines to versioned definitions and ToolGateway read/proposal capabilities.

Exact scope
Versioned definitions, schema validation, pure-engine ports, evidence-authorized ToolGateway and human-boundary regression coverage.

Explicit exclusions
No approval, send, invite, permission, release, archive, delete, waiver or signature tool.

Approved dependencies
BE-P13, BE-P14, BE-P15, BE-P16, BE-P17; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-34.

Likely files or subsystems
`src/agent/agents`, `src/agent/tools`, RAG/engines.

Deliverables
Migrated agent definitions, provenance and human-boundary end-to-end tests.

Acceptance and verification strategy
All agents produce schema-valid proposed artifacts; evidence access and every human-only prohibition have regression coverage.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Migrate definitions one by one with version pins; rollback a definition version.

Complexity, parallelization and reviews
Extra-large complexity; Wave 11 capability groups can parallelize after BE-P17/domain ports. Recommended model: gpt-5.6-sol, High reasoning. Security review required.

Deferred implementation inputs and approval gates
Model/provider certification and prompt retention policy remain acceptance gates; do not label a provider production-ready without evidence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All agents produce schema-valid proposed artifacts; evidence access and every human-only prohibition have regression coverage.
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
