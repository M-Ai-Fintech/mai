---
id: MAI-129
title: Data migration and MVP retirement
status: To Do
assignee: []
created_date: '2026-07-30 09:29'
updated_date: '2026-07-31 20:11'
labels:
  - backend
  - architecture
  - wave-14
  - mai-85-initiative
  - migration
  - persistence
  - security
  - frontend-coordination
milestone: m-12
dependencies:
  - MAI-106
  - MAI-109
  - MAI-110
  - MAI-111
  - MAI-112
  - MAI-113
  - MAI-114
  - MAI-115
  - MAI-116
  - MAI-117
  - MAI-118
  - MAI-119
  - MAI-120
  - MAI-121
  - MAI-122
  - MAI-123
  - MAI-124
  - MAI-125
  - MAI-126
  - MAI-127
  - MAI-147
  - MAI-148
  - MAI-150
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
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
  - >-
    backlog/docs/decisions/proposed-mvp-api-retirement/doc-36 -
    Proposed-ADR-Migration-and-Retirement-of-the-Mock-backed-MVP-API.md
priority: high
ordinal: 115000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P25

Objective
Implement approved migration, dual-read, reconciliation, cutover and rollback for in-memory fixtures/current PostgreSQL and retire legacy MVP registrations after consumer move.

Exact scope
Migration tooling, reconciliation manifests, staged tenant/deal batches, cutover/rollback and objective retirement proof.

Explicit exclusions
No historical evidence deletion or compatibility shim that distorts the target domain.

Approved dependencies
BE-P03, BE-P06, BE-P07, BE-P08, BE-P09, BE-P10, BE-P11, BE-P12, BE-P13, BE-P14, BE-P15, BE-P16, BE-P17, BE-P18, BE-P19, BE-P20, BE-P21, BE-P22, BE-P23, BE-P24; real Backlog IDs are maintained in doc-24.

Required ADRs
doc-28, doc-30 through doc-33, doc-36.

Likely files or subsystems
migrations, import/reconciliation tools, old API/store/schema.

Deliverables
Rehearsed migration, manifests, rollback and retirement proof.

Acceptance and verification strategy
Rehearsed import/reconcile/cutover/rollback meets thresholds; no prototype writer/consumer remains; historical manifest is retained.
Run focused tests plus the canonical verification required at execution time; use named fakes for external I/O.

Migration, rollout and rollback
Exclusive migration owner; staged tenant/deal batches; rollback only within documented window.

Complexity, parallelization and reviews
Extra-large complexity; Wave 14 serial cutover. Recommended model: gpt-5.6-sol, High reasoning. Data, security and operations approvals required.

Deferred implementation inputs and approval gates
Approved migration/cutover windows, production RPO/RTO and environment readiness evidence are mandatory go/no-go gates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Rehearsed import/reconcile/cutover/rollback meets thresholds; no prototype writer/consumer remains; historical manifest is retained.
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
Legacy agent-learning and fine-tuning retirement ownership

1. MAI-129 owns physical retirement after target replacement coverage and cutover are proven.

2. Retirement candidates include, subject to final consumer inventory:
   - src/agent/continuous_learning.ts;
   - obsolete ContinuousLearningEngine registrations and imports;
   - automatic correction-to-prompt compatibility behavior;
   - process-local feedback caches;
   - obsolete feedback persistence conventions;
   - fake LoRA adapter-loading paths;
   - fake or Gemini-backed responses labelled as fine-tuned inference;
   - obsolete FineTuningRegistry compatibility code;
   - tests that prove mocked capability rather than real governed behavior.

3. MAI-129 must not delete useful evidence, datasets, prompts, scripts, or tests before:
   - MAI-121 replacement coverage exists;
   - MAI-152 feedback/evaluation lineage exists where required;
   - MAI-153 records a Go or No-go decision;
   - active consumers are inventoried;
   - rollback and migration evidence exists.

4. Useful offline training scripts or sample datasets may be retained as explicitly labelled research evidence when legally and operationally permitted.

5. Physical retirement must preserve historical audit and Git evidence.

Legacy optimization-engine retirement ownership

1. MAI-129 owns physical retirement of obsolete optimization implementations after MAI-144, MAI-145, and MAI-146 establish replacement coverage and all consumers are migrated.

2. Retirement candidates include, subject to final consumer inventory:
   - src/engines/optimization/genetic.ts;
   - src/engines/optimization/constraints.ts;
   - legacy optimization configuration;
   - generic optimization/index.ts entry points;
   - duplicate term-sheet optimizer implementations;
   - direct CLI and agent-tool optimizer registrations;
   - unseeded genetic tests;
   - tests that treat missing KYC or financial data as feasible;
   - tests that prove only silent candidate filtering;
   - benchmark files generated as side effects of ordinary unit tests;
   - compatibility exports with no remaining consumer.

3. MAI-129 must not delete useful mathematical logic, golden vectors, benchmarks, fixtures, or migration evidence before authoritative replacements exist.

4. Useful formulas may move to MAI-144.

5. Matching eligibility and restriction logic may move to MAI-145.

6. Negotiation proposal optimization may move to MAI-146.

7. KYC, sanctions, PEP, and compliance conclusions remain evidence-backed findings and human decisions rather than optimizer-owned booleans.

8. Physical retirement must preserve Git and audit history.

Legacy agent VDR-tool retirement ownership

1. MAI-129 owns physical retirement after MAI-112, MAI-113, MAI-115, and MAI-121 provide replacement coverage.

2. Retirement candidates include, subject to final consumer inventory:
   - direct `vdrStructuredAccessTool` registration;
   - `src/agent/vdr_mock.ts`;
   - direct `VDRService` mock calls;
   - direct `ClientSiloedRAG.querySilo` calls from generic agent tools;
   - direct reads from `./vdr_rooms`;
   - folder-tag compliance heuristics;
   - automatic `COMPLIANT` or `NON_COMPLIANT` conclusions;
   - direct specialist-agent tool registrations;
   - tests that prove only mock, fixture, or in-memory behavior.

3. Useful schemas, fixtures, checklist examples, and test vectors remain migration evidence until replacement coverage exists.

4. Physical retirement preserves Git and audit history.

Legacy Papermark adapter retirement ownership

1. MAI-129 owns physical retirement after MAI-112 and MAI-127 establish replacement coverage and consumers are migrated.

2. Retirement or adaptation candidates include:
   - direct `downloadBatch` writes to `./vdr_rooms`;
   - local-directory binary authority;
   - Papermark configuration inherited from Supergood-specific types;
   - fallback metadata that fabricates current timestamps or missing provider fields;
   - direct runtime-directory naming conventions;
   - mocked-fetch tests presented as live certification;
   - compatibility exports with no remaining consumer.

3. The provider port, parsing logic, error handling, and useful contract tests may be adapted rather than deleted.

4. Physical retirement preserves useful fixtures, migration evidence, Git history, and audit evidence.
<!-- SECTION:NOTES:END -->
