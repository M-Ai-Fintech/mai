---
id: MAI-69
title: Verify coherent prototype implementation against Stitch
status: To Do
assignee:
  - '@codex'
created_date: '2026-07-19 06:53'
updated_date: '2026-07-22 05:30'
labels:
  - QA
  - GUI
  - stitch
  - verification
  - superseded
milestone: m-6
dependencies:
  - MAI-67
  - MAI-68
references:
  - gui
  - tests
priority: medium
ordinal: 7
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Validate the implemented GUI against the approved Stitch prototype and the component/backend contracts. This task is the final quality gate before considering the rework complete.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GUI build completes successfully
- [x] #2 Relevant backend, API, and frontend tests pass or documented gaps are explicitly accepted
- [x] #3 The implemented routes match the approved Stitch screen families and states
- [x] #4 No page introduces visual primitives outside the approved component library without explicit follow-up
- [x] #5 QA handoff documents covered routes, tested states, and remaining risks
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Run an independent static audit of all four route families against the unified Stitch contract and approved primitive list.
2. Exercise production routes at desktop resolution and capture runtime/console/HTTP evidence.
3. Re-run backend, API-client, frontend state, prompt, type, lint-scope, and production-build gates.
4. Correct only defects inside the approved task scope and repeat failed gates.
5. Record a QA handoff with covered routes, states, persistence boundaries, and remaining risks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA handoff (final verification): Runtime production sweep at 2560x1440 returned HTTP 200 with zero console/page errors for /, /deals, /deals/00000000-0000-4000-8000-000000000001, /entities?role=buyer, /entities/00000000-0000-4000-8000-000000000012, /deals/00000000-0000-4000-8000-000000000001/chat, /dashboard/custom, and the compatibility redirect /clients -> /entities. Covered state logic: dashboard board/table/detail, query-opened create modal and success notices; reusable entity list/detail/create/edit/validation/archive-blocked recovery; agent history loading, new-thread gate, sending/streaming/reconnect/exhaustion/cancel, tool/citation and engine empty/running/result/failed; custom dashboard loading/error/empty/edit/add/reorder/resize/remove/reset/save/conflict. Automated evidence: production build passed; frontend scoped ESLint and TypeScript passed; Vitest 27/27; API Deno tests 25/25; optimization tests 12/12; touched-backend Deno lint and server check passed; Stitch prompt validator passed with 1 prompt, 4 families, 23 references; git diff check passed. Boundaries: MVP persistence is mock-backed in memory and resets with the API process; authentication/authorization is outside this milestone; Gemini runs in DRY-RUN fallback when no key is configured. All transition reducers/contracts are tested, but not every interaction-state combination was manually browser-exercised. Intentional mapping: backend widget type agent_entry renders the approved prototype-only Team Activity card; it does not claim a persisted activity-feed contract.

Final correction: frontend unit total is 29/29 after breadcrumb and assistant-response regression coverage. Independent final static audit PASS with no remaining master-contract blockers. Post-fix production sweep repeated all eight route checks at 2560x1440 with zero console/page errors; entity list normalized to country=BR and detail rendered the actual legal-name breadcrumb.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:29
---
## Rebaseline disposition — 2026-07-22\n\nSuperseded by MAI-79. The original Stitch verification depends on missing handoff artifacts and cannot be reproduced as a definitive Done gate.\n\nThis task is archived as superseded rather than treated as completed. Any remaining required outcome is tracked by the referenced replacement task or milestone.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Verified and repaired the unified MVP_6 prototype across the dashboard, deal, reusable entity, agentic, and custom-layout route families. The shared Stitch component/version contract is enforced; route transitions, validation, conflict, loading, empty, error, success, SSE reconnect, and layout persistence states are implemented against the mock-backed MVP API. Final gates: production build, scoped lint, TypeScript, 29 frontend tests, 25 API tests, 12 optimization tests, prompt validator, independent static audit, diff check, and eight-route 2560x1440 production smoke test all passed.
<!-- SECTION:FINAL_SUMMARY:END -->
