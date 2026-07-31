---
id: MAI-120
title: Agent mission and run platform
status: To Do
assignee: []
created_date: '2026-07-30 09:28'
updated_date: '2026-07-31 21:16'
labels:
  - backend
  - architecture
  - mai-85-initiative
  - agent-architecture
  - security
  - persistence
  - jobs
  - api
  - delivery-wave-f
milestone: m-12
dependencies:
  - MAI-106
  - MAI-107
  - MAI-109
  - MAI-113
  - MAI-114
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-events-outbox-inbox-jobs/doc-31 -
    Proposed-ADR-Events-Outbox-Inbox-and-Jobs.md
  - >-
    backlog/docs/decisions/proposed-audit-evidence-provenance/doc-32 -
    Proposed-ADR-Audit-Evidence-Versioning-and-Provenance.md
  - >-
    backlog/docs/decisions/proposed-agent-human-authority/doc-34 -
    Proposed-ADR-Agent-Execution-and-Human-Authority.md
priority: high
ordinal: 60100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P17

Objective
Deliver Mission, Plan, Run, Step, Tool Activity, Result and Artifact records with a durable governed runner.

Exact scope
Mission/plan/run/step state, model metadata/cost, cancellation/retry, tool authorization, stale invalidation, durable recovery and audit.

Explicit exclusions
No specialist-agent migration, direct side-effect tool, external communication or AI-owned approval.

Approved dependencies
BE-P03, BE-P04, BE-P08, BE-P10, BE-P11; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-31, doc-32, doc-34.

Likely files or subsystems
replace `src/agent` orchestration/pubsub; new runtime.

Deliverables
Durable runtime, recovery/failure/policy tests.

Acceptance and verification strategy
Runs recover after restart, tools reauthorize, stale sources invalidate, cost/model/tool records complete and prohibited effects are impossible.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Shadow existing agent outputs; no side-effect cutover; rollback runner while preserving attempts.

Complexity, parallelization and reviews
Extra-large complexity; Wave 10 parallel capability after dependencies. Recommended model: gpt-5.6-sol, High reasoning. Security and infrastructure reviews required.

Deferred implementation inputs and approval gates
Model/provider selection, secrets credentials and model/prompt retention policy remain explicit gates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Runs recover after restart, tools reauthorize, stale sources invalidate, cost/model/tool records complete and prohibited effects are impossible.
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
