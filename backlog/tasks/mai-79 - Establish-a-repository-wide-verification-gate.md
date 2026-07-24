---
id: MAI-79
title: Establish a repository-wide verification gate
status: In Progress
assignee: []
created_date: '2026-07-22 05:24'
updated_date: '2026-07-24 09:17'
labels:
  - testing
  - reliability
milestone: m-9
dependencies:
  - MAI-87
modified_files:
  - deno.json
  - gui/package.json
  - scripts/verify.ts
  - scripts/verify_test.ts
  - scripts/verify_integration.ts
  - scripts/verify_integration_test.ts
  - README.md
  - gui/README.md
  - .agents/skills/luis/solve-mai/phases/05-verification.md
  - .agents/skills/luis/solve-mai/phases/07-finalization.md
  - graphify-out/graph.json
  - graphify-out/GRAPH_REPORT.md
priority: high
ordinal: 71000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create one canonical local verification command that proves the repository state before any task can become Done. The current Deno configuration only discovers tests/**/*.spec.ts, omits colocated src/**/*.test.ts tests, and does not aggregate GUI, Storybook, build, or integration checks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 One documented command runs every Deno unit, integration, and colocated test under both tests/ and src/
- [ ] #2 The gate runs GUI unit tests, Next.js production build, Storybook build, and Storybook interaction tests
- [ ] #3 The obsolete Stitch validator is not part of the canonical gate and no package script references a missing validator file
- [ ] #4 Any failed child command makes the aggregate command fail with a clear component-level summary
- [ ] #5 Real PostgreSQL, Gemini, and Papermark smoke tests are available in an explicit integration profile and never silently pass through mocks
- [ ] #6 The task completion workflow references this verification gate as mandatory evidence for Done
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a root Deno verification runner and broaden Deno test discovery to every supported test convention in tests/, src/, and its runner coverage.
2. Add GUI unit-test command; aggregate it with Next production build, Storybook build, documentation validation, and Storybook browser interactions, with one component-level failure summary.
3. Remove the obsolete missing Stitch validator and update GUI/root documentation with canonical gate and prerequisites.
4. Add an opt-in live integration profile that requires real PostgreSQL, Gemini, and Papermark credentials and fails when they are absent or invalid.
5. Make solve-mai completion verification require deno task verify evidence, then run focused and full gate checks, record exact evidence, and submit for human review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Changes
- Added `deno task verify` with component-level result aggregation and non-zero exit on any child failure.
- Expanded Deno discovery to `.spec.ts`, `.test.ts`, and `_test.ts` under `tests/`, `src/`, and `scripts/`.
- Added GUI unit-test command and removed obsolete `validate:stitch-prompt`.
- Added a credential-required `deno task verify:integration` profile for real PostgreSQL, Gemini, and Papermark checks.
- Documented prerequisites and made solve-mai verification/finalization require `deno task verify` evidence.

## Verification
- `deno fmt --check deno.json scripts/verify.ts scripts/verify_test.ts scripts/verify_integration.ts scripts/verify_integration_test.ts` — passed.
- `deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net scripts/verify_test.ts scripts/verify_integration_test.ts` — 3 passed.
- `deno task verify:integration` without credentials — failed as designed, naming every required real-service variable and never selecting mocks.
- `npm --prefix gui run test:unit` — 29 passed.
- `npm --prefix gui run validate:storybook-docs` — 24 files validated.
- `npm --prefix gui run build` — passed outside sandbox (Google Fonts access required).
- `npm --prefix gui run build-storybook` — passed.
- `npm --prefix gui run test-storybook -- --run` — 89 passed outside sandbox (local browser server required).
- `git diff --check` — passed.

## Blocker
- `deno task verify` correctly fails because the newly included existing Deno suite has 14 failing tests: Pub/Sub, genetic selection, VDR/RAG/memory, Papermark, CLI/e2e agent compatibility, and a Hugging Face dependency fetch. Fixing those separate product defects is outside MAI-79's approved gate-establishment scope, so its clean-checkout DoD cannot yet be checked.

## Follow-up
- MAI-79.1 is now the explicit prerequisite for the existing Deno failures exposed by this gate. It is a child task and MAI-79 depends on it; completion must record a green `deno task verify` result here before MAI-79 can be finalized.

## Follow-up correction
- MAI-79.1 was archived because decimal child IDs are not the current MAI convention. MAI-87 supersedes it as MAI-79's required prerequisite and completion must return green-gate evidence to MAI-79.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 The aggregate gate passes from a clean checkout with documented prerequisites
- [ ] #2 A controlled failing check proves that failures propagate to the final exit code
- [ ] #3 No test suite is excluded solely because of its directory or filename convention
<!-- DOD:END -->
