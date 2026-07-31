---
id: MAI-121
title: Governed agent definitions and tools
status: To Do
assignee: []
created_date: '2026-07-30 09:29'
updated_date: '2026-07-31 20:09'
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
  - MAI-118
  - MAI-119
  - MAI-120
  - MAI-147
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-agent-human-authority/doc-34 -
    Proposed-ADR-Agent-Execution-and-Human-Authority.md
priority: high
ordinal: 107000
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Legacy learning and model-adaptation migration boundary

1. MAI-121 must migrate agent definitions and tools away from automatic runtime self-learning.

2. The target agent runtime must not register or depend on behavior that:
   - automatically injects unreviewed corrections into prompts;
   - writes feedback as generic authoritative preferences or domain knowledge;
   - uses process-local feedback caches as authority;
   - treats vector similarity or keywords as compliance policy;
   - modifies prompts, knowledge, tools, models, or weights without a governed promotion decision.

3. MAI-152 owns the target audited feedback, evaluation-dataset, and offline improvement workflow.

4. MAI-121 must remove, deny, or fence legacy runtime access to:
   - ContinuousLearningEngine production registration;
   - automatic correction-to-prompt behavior;
   - ungoverned correction persistence;
   - direct feedback-driven domain-knowledge mutation.

5. MAI-121 must remove or deny tool actions that falsely claim:
   - LoRA adapter loading;
   - adapted-model loading;
   - fine-tuned inference;
   - successful model adaptation.

6. `load_lora_adapter` and `fine_tuned_inference` must not remain active governed tool capabilities unless a later approved implementation and MAI-127 certification prove real behavior.

7. Gemini or canned text cannot be returned under a fine-tuned-inference label.

8. Unsupported model-adaptation capability must return an explicit unavailable or unsupported result.

9. MAI-153 owns the future model-adaptation strategy decision.

10. Legacy code and tests remain migration evidence until MAI-129 cutover.

Agent document-tool capability boundary

1. Agents receive capability-scoped read or proposal tools through the governed ToolGateway boundary.

2. Agents do not access:
   - provider credentials;
   - connector secrets;
   - local filesystem paths;
   - raw object-store credentials;
   - unrestricted provider clients;
   - unscoped vector indexes.

3. Supported agent capabilities may include authorized:
   - document listing;
   - exact-version metadata retrieval;
   - exact-version content retrieval;
   - evidence search;
   - citation proposal;
   - missing-document Finding proposal.

4. Tools return exact evidence and Document Version references.

5. Tools cannot:
   - upload without separate authorization;
   - delete;
   - invite;
   - change provider permissions;
   - release;
   - approve a Finding;
   - declare compliance;
   - declare a deal-breaker;
   - create a final Decision Record.

6. Unsupported capabilities return explicit denied or unavailable results.

7. The direct `vdrStructuredAccessTool` is migration evidence, not the target ToolGateway contract.
<!-- SECTION:NOTES:END -->
