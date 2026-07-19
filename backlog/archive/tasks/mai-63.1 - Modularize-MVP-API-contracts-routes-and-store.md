---
id: MAI-63.1
title: Modularize MVP API contracts routes and store
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-19 16:48'
labels:
  - backend
  - refactor
  - api
  - tests
milestone: m-6
dependencies:
  - MAI-67
references:
  - src/api/contracts.ts
  - src/api/mvp_routes.ts
  - src/api/mvp_store.ts
  - tests/api
parent_task_id: MAI-63
priority: high
ordinal: 8
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor the MVP_6 API monoliths into domain-focused modules without changing public contracts, runtime behavior, error envelopes, seeded data, or endpoint semantics. Reorganize tests/api to mirror the new module boundaries and retain end-to-end route coverage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Contracts are split into cohesive domain modules with a stable barrel export
- [ ] #2 MVP store responsibilities are split by domain while preserving one public store API and seeded behavior
- [ ] #3 Route handlers are split by domain while preserving endpoint, envelope, and error semantics
- [ ] #4 API tests mirror the modular structure and all prior contract, store, and route cases pass
- [ ] #5 Deno lint and type checks pass for the refactored API
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory exports, cross-domain dependencies, and current test coverage. 2. Introduce contracts, store, and route subdirectories with stable barrel compatibility. 3. Move tests into matching domain-focused files without weakening assertions. 4. Run lint, check, focused API tests, and server integration checks. 5. Record migration notes and QA evidence.
<!-- SECTION:PLAN:END -->
