---
id: MAI-70
title: Modularize MVP API contracts routes and store
status: Done
assignee:
  - '@codex'
created_date: '2026-07-19 16:48'
updated_date: '2026-07-22 05:30'
labels:
  - backend
  - refactor
  - api
  - tests
  - revalidated
milestone: m-12
dependencies:
  - MAI-67
references:
  - src/api/contracts.ts
  - src/api/mvp_routes.ts
  - src/api/mvp_store.ts
  - tests/api
modified_files:
  - src/api/contracts.ts
  - src/api/contracts
  - src/api/mvp_store.ts
  - src/api/store
  - src/api/mvp_routes.ts
  - src/api/routes
  - tests/api
  - README.md
  - context/nextjs_gui_and_api.md
priority: high
ordinal: 8
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor the MVP_6 API monoliths into domain-focused modules without changing public contracts, runtime behavior, error envelopes, seeded data, or endpoint semantics. Reorganize tests/api to mirror the new module boundaries and retain end-to-end route coverage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Contracts are split into cohesive domain modules with a stable barrel export
- [x] #2 MVP store responsibilities are split by domain while preserving one public store API and seeded behavior
- [x] #3 Route handlers are split by domain while preserving endpoint, envelope, and error semantics
- [x] #4 API tests mirror the modular structure and all prior contract, store, and route cases pass
- [x] #5 Deno lint and type checks pass for the refactored API
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory exports, cross-domain dependencies, and current test coverage. 2. Introduce contracts, store, and route subdirectories with stable barrel compatibility. 3. Move tests into matching domain-focused files without weakening assertions. 4. Run lint, check, focused API tests, and server integration checks. 5. Record migration notes and QA evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Contracts modularized into common, deals, entities, chat, engines, notifications, dashboard, and HTTP domain files. src/api/contracts.ts remains a 3-line compatibility barrel through contracts/index.ts; all 90 public symbols remain available. Verification: deno fmt, deno lint, deno check, 4 focused contract tests, and git diff --check passed.

Route refactor: reduced src/api/mvp_routes.ts to an 88-line stable facade and moved ordered handlers into src/api/routes/{entities_team,deals,chat,engines_documents,notifications,dashboard}.ts, with shared validation/error helpers and dependency defaults isolated in shared.ts/dependencies.ts. Preserved public dependency type exports, default singleton store, route order, SSE lifecycle, error mapping, envelopes, and null for unrelated paths. Verification: deno fmt/lint/check passed; deno check src/api/server.ts passed; all 25 modular API tests passed.

Store modularization complete: src/api/mvp_store.ts is now a 263-line stable facade over shared state plus domain repositories in src/api/store/ (deals, entities, team, chat, engines, notifications, layouts), with seed/error/ID/type/utility modules. Public exports, deterministic seed clock/IDs, optimistic versions, defensive copies, deal/entity archive invariant, and deal-scoped chat/engine/team behavior are preserved. Verification: deno fmt --check and deno lint passed for mvp_store/store; deno check src/api/mvp_store.ts passed; all 25 reorganized API tests passed, including 10 store tests.

Final QA: tests/api now mirrors contracts/store/routes with shared support fixtures and preserves 25/25 original behavior cases. Consolidated deno fmt --check and deno lint passed across 46 API/test files; deno check src/api/server.ts passed. Live server smoke returned 200 with stable list/resource envelopes for deals, BR entities, and custom dashboard layout. Documentation now records stable façade imports and route precedence.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-07-22 05:30
---
## Done revalidation — 2026-07-22\n\nDone is preserved. MVP API contracts, routes, store modules, and compatibility facades are separated and 25/25 focused API tests pass. The result is a structural refactor; persistence remains intentionally mock-backed under MAI-67.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Split the 2,570-line MVP API surface into domain modules while preserving contracts.ts, mvp_store.ts, and mvp_routes.ts as stable public façades. Reorganized all API tests by contracts, store, and routes without reducing the 25 behavioral cases; format, lint, server type-check, direct tests, live HTTP smoke, and diff checks pass.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 API contract, route, and store boundaries are modular and tested
- [x] #2 All focused API tests pass
- [x] #3 Compatibility facades preserve the explicit prototype boundary
<!-- DOD:END -->
