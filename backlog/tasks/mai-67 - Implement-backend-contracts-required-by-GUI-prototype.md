---
id: MAI-67
title: Implement backend contracts required by GUI prototype
status: Done
assignee: []
created_date: '2026-07-19 06:53'
updated_date: '2026-07-28 02:59'
labels:
  - backend
  - api
  - GUI
  - revalidated
milestone: m-12
dependencies: []
references:
  - src/api/server.ts
  - gui/lib/api-client.ts
modified_files:
  - src/api/contracts.ts
  - src/api/mvp_store.ts
  - src/api/mvp_routes.ts
  - src/api/server.ts
  - src/engines/optimization/kyc/kyc_valuation_solver.ts
  - gui/lib/api-client.ts
  - gui/lib/api-client.test.ts
  - gui/vitest.unit.config.ts
  - tests/api/contracts.spec.ts
  - tests/api/mvp_store.spec.ts
  - tests/api/mvp_routes.spec.ts
priority: high
ordinal: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement or normalize the backend and API-client contracts required by the approved Stitch prototype. This includes only the capabilities confirmed by the backend audit and needed by the first coherent GUI pass.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ApiClient exposes typed methods for all prototype-backed interactions
- [x] #2 Client/entity CRUD endpoints needed by the approved prototype are implemented or explicitly scoped as mock-backed MVP endpoints
- [x] #3 Deal dashboard data, phase transitions, engine outputs, chat, notifications, and layout preferences use stable response shapes
- [x] #4 Relevant backend and API tests cover the new or normalized contracts
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define stable shared DTO, list, error, and event contracts.
2. Implement a deterministic mock-backed MVP service for missing entity, team, chat, engine-history, notification, and layout capabilities.
3. Add HTTP routes with validation, version conflicts, pagination, and typed streaming events.
4. Normalize deal and engine responses without breaking existing analytical modules.
5. Replace the GUI API boundary with Zod-validated typed methods.
6. Add focused route, store, and API-client verification.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented stable shared DTO/envelope contracts, deterministic mock-backed MVP persistence, versioned CRUD and phase transitions, typed SSE chat lifecycle, engine/VDR/document/notification/layout routes, and a Zod-validated GUI ApiClient. Persistence is explicitly disclosed as mock-backed-in-memory via X-MAI-Persistence.

Validation: 25 Deno API contract/store/route tests passed; 5 Vitest ApiClient tests passed; deno check src/api/server.ts passed; 8 optimization regression tests passed with declared read/env/FFI permissions; live HTTP smoke tests returned 200 for deals, entities, and custom layout with stable envelopes and persistence headers. Full GUI tsc remains gated only by the two pre-existing FormField and Spinner story type defects tracked in MAI-68.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:30
---
## Done revalidation — 2026-07-22\n\nDone is preserved because the task explicitly scopes the deliverable as a mock-backed in-memory GUI prototype. The modular API contracts and injected operation routes pass 25/25 focused API tests. This does not claim real PostgreSQL, engines, VDR, documents, or LLM execution.
---

author: Codex
created: 2026-07-28 02:59
---
Retained as completed prototype evidence. Under the 2026-07-27 MAI-85 rebaseline, its backend contracts and mock-backed workflow do not constrain the target frontend or backend architecture; redesign is governed by MAI-85.15.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented and integrated the backend/API-client contract required by the coherent prototype: typed deal and entity CRUD, team assignments, phase transitions, chat streaming, engine history, safe VDR/document metadata, notifications, and versioned dashboard layouts. Verified at store, route, client, engine-regression, server-typecheck, and live HTTP levels.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 The mock-backed in-memory boundary is explicit in task and developer documentation
- [x] #2 All focused API contract, route, and store tests pass
- [x] #3 No result from the prototype defaults is represented as a real external integration
<!-- DOD:END -->
