---
id: MAI-31
title: 'Fluxo de ponta a ponta: Sourcing -> DD -> Closing'
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:26'
updated_date: '2026-07-22 05:29'
labels:
  - core
  - integration
  - poc
  - revalidation
milestone: m-13
dependencies: []
parent_task_id: MAI-19
priority: medium
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Validate and test the complete end‑to‑end orchestration of the M&A middleware, passing realistic mock data through the Sourcing, Due Diligence (FinancialRisk + LegalDueDiligence), and Closing agents. The flow must exercise the Pub/Sub messaging layer, VDR adapters, ONNX inference engine, Gemini search tool, and Database Memory Service, producing the expected artifacts at each stage and a final closing preview markdown. Include error handling, logging with correlation IDs, and performance constraints suitable for the MVP environment.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Successful execution of the full pipeline with mock data produces a final closing preview markdown without errors
- [ ] #2 Sourcing agent generates a complete sourcing report; FinancialRisk agent returns a quantitative risk score from the ONNX model; LegalDueDiligence agent produces a legal summary
- [ ] #3 All Pub/Sub messages are published and consumed as expected, with no lost or duplicate events
- [ ] #4 Pipeline completes within 30 seconds on a standard development machine
- [ ] #5 Logs contain a unique correlation ID that links all stages of the transaction
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Review existing agent implementations and identify integration points.
2. Create mock VDR data and test Pub/Sub topics in a test harness.
3. Implement a new e2e test script (tests/e2e/flow.test.ts) that triggers the orchestrator with mock data.
4. Extend each agent (if needed) to emit a correlation ID and log it.
5. Add assertions for the presence and correctness of the sourcing report, ONNX risk score, legal summary, and closing preview.
6. Measure execution time and enforce the 30‑second limit.
7. Update CI pipeline to run the new e2e test on each push.
8. Refresh README and architecture docs with a new flow diagram.
9. Perform a manual run, verify logs, and address any failures.
10. Submit PR, get reviewer approval, merge, and close the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
[POC Orchestrator Note] Grupo C (Síncrono final): Criar E2E unificando os componentes.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Technical Audit
created: 2026-07-10 06:04
---
[CRITICAL REVIEW] 1. Mocked integration test: `e2e/flow.test.ts` monkey-patches `DatabaseMemoryService.prototype.query` to return mocked data, preventing real database-integration validation. 2. Silent AI fallbacks: Without `GEMINI_API_KEY`, agents run entirely on fallbacks and transparently intercepted static mock responses, masking whether real prompts work in an E2E flow.
---

author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The purported end-to-end flow manually invokes simulated stages and accepts mock results; the current CLI KYB E2E test also fails. Reopen for an orchestrated banker flow with real dependency boundaries.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code changes implemented and merged into the main branch
- [ ] #2 Unit tests added for each agent integration and passing
- [ ] #3 End‑to‑end integration test added to CI and all tests pass
- [ ] #4 Documentation updated with flow diagram, setup instructions, and artifact descriptions
- [ ] #5 Task status moved to Done and approved by code reviewer
<!-- DOD:END -->
