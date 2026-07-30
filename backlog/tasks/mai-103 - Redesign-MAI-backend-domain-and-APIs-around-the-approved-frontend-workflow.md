---
id: MAI-103
title: 'Redesign MAI backend, domain, and APIs around the approved frontend workflow'
status: In Progress
assignee:
  - '@chatgpt'
created_date: '2026-07-28 03:08'
updated_date: '2026-07-30 06:58'
labels:
  - backend
  - architecture
  - domain-model
  - api-design
  - planning
  - mai-85-initiative
milestone: m-12
dependencies:
  - MAI-102
documentation:
  - design/
  - gui/conformance/mai102-authority-matrix.json
  - gui/screens/screen-contracts.ts
  - >-
    backlog/docs/architecture/system-core/doc-2 -
    System-and-Core-Architecture.md
  - >-
    backlog/docs/architecture/agent-workflows/doc-3 -
    Agent-Architecture-and-Workflows.md
  - >-
    backlog/docs/architecture/data-and-memory/doc-4 -
    Data-and-Memory-Architecture.md
  - backlog/docs/architecture/engines/doc-5 - Engine-Architecture.md
  - >-
    backlog/docs/architecture/vdr-and-integrations/doc-6 -
    VDR-and-Integration-Architecture.md
  - backlog/docs/domain/domain-model/doc-7 - MA-Domain-Model.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - >-
    backlog/docs/governance/document-inventory/doc-12 -
    Documentation-Inventory-and-Classification.md
  - >-
    backlog/docs/architecture/backend-redesign/api-async-agent-integrations/doc-22
    - MAI-103-API-Jobs-Events-Agent-Execution-and-Integration-Catalog.md
  - >-
    backlog/docs/architecture/backend-redesign/current-state-disposition/doc-23
    - MAI-103-Current-Backend-Disposition.md
  - >-
    backlog/docs/architecture/backend-redesign/domain-workflows/doc-20 -
    MAI-103-Bounded-Contexts-Aggregates-and-Workflow-State-Machines.md
  - >-
    backlog/docs/architecture/backend-redesign/gap-matrix/doc-19 -
    MAI-103-Frontend-to-Backend-Gap-Matrix.md
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/architecture/backend-redesign/security-persistence/doc-21 -
    MAI-103-Tenancy-Authorization-Persistence-Audit-and-Provenance-Architecture.md
  - >-
    backlog/docs/decisions/proposed-agent-human-authority/doc-34 -
    Proposed-ADR-Agent-Execution-and-Human-Authority.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
  - >-
    backlog/docs/decisions/proposed-audit-evidence-provenance/doc-32 -
    Proposed-ADR-Audit-Evidence-Versioning-and-Provenance.md
  - >-
    backlog/docs/decisions/proposed-bounded-contexts-aggregate-ownership/doc-26
    - Proposed-ADR-Bounded-Contexts-and-Aggregate-Ownership.md
  - >-
    backlog/docs/decisions/proposed-concurrency-versioning/doc-30 -
    Proposed-ADR-Concurrency-and-Aggregate-Versioning.md
  - >-
    backlog/docs/decisions/proposed-documents-vdr-object-storage/doc-35 -
    Proposed-ADR-Documents-VDR-and-Object-Storage.md
  - >-
    backlog/docs/decisions/proposed-events-outbox-inbox-jobs/doc-31 -
    Proposed-ADR-Events-Outbox-Inbox-and-Jobs.md
  - >-
    backlog/docs/decisions/proposed-modular-monolith-boundaries/doc-25 -
    Proposed-ADR-Target-Modular-Monolith-and-Service-Boundaries.md
  - >-
    backlog/docs/decisions/proposed-mvp-api-retirement/doc-36 -
    Proposed-ADR-Migration-and-Retirement-of-the-Mock-backed-MVP-API.md
  - >-
    backlog/docs/decisions/proposed-postgresql-row-level-security/doc-29 -
    Proposed-ADR-PostgreSQL-Row-Level-Security.md
  - >-
    backlog/docs/decisions/proposed-postgresql-schema-transactions/doc-28 -
    Proposed-ADR-PostgreSQL-Schema-and-Transaction-Strategy.md
  - >-
    backlog/docs/decisions/proposed-tenancy-authorization/doc-27 -
    Proposed-ADR-Tenancy-and-Authorization-Model.md
modified_files:
  - >-
    backlog/docs/architecture/system-core/doc-2 -
    System-and-Core-Architecture.md
  - >-
    backlog/docs/architecture/agent-workflows/doc-3 -
    Agent-Architecture-and-Workflows.md
  - >-
    backlog/docs/architecture/data-and-memory/doc-4 -
    Data-and-Memory-Architecture.md
  - backlog/docs/architecture/engines/doc-5 - Engine-Architecture.md
  - >-
    backlog/docs/architecture/vdr-and-integrations/doc-6 -
    VDR-and-Integration-Architecture.md
  - backlog/docs/domain/domain-model/doc-7 - MA-Domain-Model.md
  - backlog/docs/product/mvp-gui-and-api/doc-9 - MVP-GUI-and-API-Behavior.md
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - >-
    backlog/docs/governance/document-inventory/doc-12 -
    Documentation-Inventory-and-Classification.md
  - >-
    backlog/docs/architecture/backend-redesign/api-async-agent-integrations/doc-22
    - MAI-103-API-Jobs-Events-Agent-Execution-and-Integration-Catalog.md
  - >-
    backlog/docs/architecture/backend-redesign/current-state-disposition/doc-23
    - MAI-103-Current-Backend-Disposition.md
  - >-
    backlog/docs/architecture/backend-redesign/domain-workflows/doc-20 -
    MAI-103-Bounded-Contexts-Aggregates-and-Workflow-State-Machines.md
  - >-
    backlog/docs/architecture/backend-redesign/gap-matrix/doc-19 -
    MAI-103-Frontend-to-Backend-Gap-Matrix.md
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/architecture/backend-redesign/security-persistence/doc-21 -
    MAI-103-Tenancy-Authorization-Persistence-Audit-and-Provenance-Architecture.md
  - >-
    backlog/docs/decisions/proposed-agent-human-authority/doc-34 -
    Proposed-ADR-Agent-Execution-and-Human-Authority.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
  - >-
    backlog/docs/decisions/proposed-audit-evidence-provenance/doc-32 -
    Proposed-ADR-Audit-Evidence-Versioning-and-Provenance.md
  - >-
    backlog/docs/decisions/proposed-bounded-contexts-aggregate-ownership/doc-26
    - Proposed-ADR-Bounded-Contexts-and-Aggregate-Ownership.md
  - >-
    backlog/docs/decisions/proposed-concurrency-versioning/doc-30 -
    Proposed-ADR-Concurrency-and-Aggregate-Versioning.md
  - >-
    backlog/docs/decisions/proposed-documents-vdr-object-storage/doc-35 -
    Proposed-ADR-Documents-VDR-and-Object-Storage.md
  - >-
    backlog/docs/decisions/proposed-events-outbox-inbox-jobs/doc-31 -
    Proposed-ADR-Events-Outbox-Inbox-and-Jobs.md
  - >-
    backlog/docs/decisions/proposed-modular-monolith-boundaries/doc-25 -
    Proposed-ADR-Target-Modular-Monolith-and-Service-Boundaries.md
  - >-
    backlog/docs/decisions/proposed-mvp-api-retirement/doc-36 -
    Proposed-ADR-Migration-and-Retirement-of-the-Mock-backed-MVP-API.md
  - >-
    backlog/docs/decisions/proposed-postgresql-row-level-security/doc-29 -
    Proposed-ADR-PostgreSQL-Row-Level-Security.md
  - >-
    backlog/docs/decisions/proposed-postgresql-schema-transactions/doc-28 -
    Proposed-ADR-PostgreSQL-Schema-and-Transaction-Strategy.md
  - >-
    backlog/docs/decisions/proposed-tenancy-authorization/doc-27 -
    Proposed-ADR-Tenancy-and-Authorization-Model.md
priority: high
ordinal: 1600
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Delivery step 15 of the MAI-85 initiative.

Redesign the MAI backend architecture, domain model, persistence, permissions, workflows, and API contracts from the approved and verified frontend experience.

This is an architecture and implementation-planning task, not backend implementation. Current MVP routes, mock-backed services, and prototype contracts must be assessed as evidence and may be kept, replaced, or removed; they do not constrain the target model. Backend implementation tasks may be created with the next available IDs only after this redesign is approved.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A screen, action, state, permission, and workflow-to-domain/API gap matrix covers the approved frontend.
- [x] #2 Canonical domain concepts, aggregates, workflow state machines, commands, events, approval boundaries, and permission rules are defined.
- [x] #3 Persistence, tenancy and isolation, audit, versioning, evidence, and provenance requirements are explicit.
- [x] #4 Synchronous APIs, asynchronous jobs, event or streaming needs, and external-integration contracts are defined.
- [x] #5 Current MVP and prototype routes, stores, services, and contracts are classified as keep, replace, or remove without treating them as constraints.
- [x] #6 Canonical architecture, product, domain, and ADR documentation is updated through governed Backlog workflows.
- [ ] #7 An independently deliverable, dependency-ordered backend implementation task plan is approved; only then may those tasks be created with the next available IDs.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the approved 25-family frontend authority, accepted MAI-102 deviations, governed product/architecture documents, and current backend/tests as evidence; do not alter frontend or Graphify outputs.
2. Build one canonical frontend-to-backend gap matrix covering routes, actors, states, commands, queries, read models, permissions, tenancy, evidence, provenance, concurrency, idempotency, asynchronous needs, gaps, target design, and current disposition.
3. Define bounded contexts, aggregate ownership/references, domain concepts, invariants, commands, events, read models, human-only transitions, and irreversible boundaries without a universal Deal aggregate.
4. Define workflow state machines, transition contracts, AI prohibitions, human approvals, stale-data invalidation, concurrency, idempotency, audit, evidence, and failure behavior.
5. Define tenancy, authentication, authorization, purpose/sponsor/expiry isolation, deny-before-load DTO policy, PostgreSQL RLS decision, persistence, history, concurrency, outbox/inbox/jobs, retention, archive, legal hold, erasure, recovery, and MVP/PostgreSQL migration.
6. Define synchronous API families, stable protected errors, jobs/events/polling/SSE/WebSocket/webhook boundaries, agent execution, and integration contracts with honest maturity states.
7. Classify every relevant current route, contract, store, repository, schema, service, bus, agent, tool, engine, provider, fixture, test, and document as Keep, Adapt, Replace, or Remove with migration and retirement consequences.
8. Create governed canonical MAI-103 documentation and twelve proposed ADRs with Backlog-allocated document IDs; update/supersede the existing architecture, domain, product, index, and inventory authorities while retaining historical context.
9. Produce a dependency-ordered BE-Pxx implementation plan with scope, exclusions, dependencies, acceptance criteria, verification, migration/rollout/rollback, complexity, parallelization, model routing, security/data/frontend/infrastructure gates; do not create downstream tasks before owner approval.
10. Run one compact consistency and architecture-quality audit after the complete proposal exists; correct only material contradictions, missing boundaries, or unexecutable plan items.
11. Run the requested final verification once, retain explicit exit statuses, commit and push the documentation-only changes, open one Draft PR to master, record factual Backlog evidence, and keep MAI-103 In Progress with criterion 7 unchecked pending owner approval.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-07-30 intake: fetched latest origin/master successfully; starting master SHA is 2c8b029d4fd9af7bd30000e9f3452c2852e1227f. Worktree was clean before task-state mutation. MAI-102 is Done and merged on master; MAI-103 was To Do with dependency MAI-102. Duplicate task, MAI-103 branch/commit, and PR checks found no competing owner. Created feat/MAI-103-backend-domain-api-redesign directly from origin/master and restored hook-generated Graphify changes so graphify-out remains untouched. Scope is documentation, architecture, domain/API/migration design, and implementation planning only; no backend implementation or downstream task creation. Model route for intake/discovery/authoring/review: high-complexity cross-system architecture with security, data, migration, and human-authority consequences; primary Codex gpt-5.6-sol High per owner instruction, fallback gpt-5.6-terra High only if Sol is unavailable. Codex live plan quota is not exposed; no model fallback has been triggered.

2026-07-30 proposal: created governed doc-19 through doc-24 and proposed ADR doc-25 through doc-36; updated doc-2 through doc-7, doc-9, doc-10, and doc-12 through Backlog workflows. The one permitted read-only architecture audit reported 0 P0 and 6 P1 findings. The coordinator corrected aggregate completeness, bounded-context ownership, the dependency graph/waves, the /api/v1 prefix, governed document identifiers, the missing AppBootstrapper disposition, and an independently found API-catalog Markdown table delimiter issue. Coordinator recheck shows no remaining open architecture P0/P1. No backend/frontend/Figma/Graphify implementation or downstream task was created. Acceptance criterion 7 remains unchecked pending owner approval.

2026-07-30 final verification: initial sandboxed pass retained git status --short=0, git diff --check=0, documentation check=0, deno task verify=1 because Node subprocess execution was sandbox-blocked and locked GUI dependencies were absent. Applied the smallest environment-only correction: PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm --prefix gui ci (exit 0; no browser installed), then reran outside the sandbox. Final retained statuses: git status --short=0; git diff --check=0; deno run --allow-read scripts/check_docs.ts=0 (Documentation check passed); deno task verify=0 (all 17 canonical checks passed, including Deno tests, GUI unit/build/workflows, Storybook build and interaction tests). The dependency install reported 15 existing audit findings (3 moderate, 12 high); no dependency file changed and no audit-fix/upgrade was performed because it is outside MAI-103.
<!-- SECTION:NOTES:END -->
