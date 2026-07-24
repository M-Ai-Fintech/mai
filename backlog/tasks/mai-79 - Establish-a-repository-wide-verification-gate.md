---
id: MAI-79
title: Establish a repository-wide verification gate
status: In Progress
assignee: []
created_date: '2026-07-22 05:24'
updated_date: '2026-07-24 15:15'
labels:
  - testing
  - reliability
milestone: m-9
dependencies:
  - MAI-87
references:
  - 'https://github.com/M-Ai-Fintech/MVP/pull/4'
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
- [x] #1 One documented command runs every Deno unit, integration, and colocated test under both tests/ and src/
- [x] #2 The gate runs GUI unit tests, Next.js production build, Storybook build, and Storybook interaction tests
- [x] #3 The obsolete Stitch validator is not part of the canonical gate and no package script references a missing validator file
- [x] #4 Any failed child command makes the aggregate command fail with a clear component-level summary
- [x] #5 Real PostgreSQL, Gemini, and Papermark smoke tests are available in an explicit integration profile and never silently pass through mocks
- [x] #6 The task completion workflow references this verification gate as mandatory evidence for Done
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
- Added a credential-required `deno task verify:integration` profile for real PostgreSQL, Gemini, Papermark, and Transformers checks.
- Documented prerequisites and made solve-mai verification/finalization require `deno task verify` evidence.

## Verification
- `deno fmt --check deno.json scripts/verify.ts scripts/verify_test.ts scripts/verify_integration.ts scripts/verify_integration_test.ts` — passed.
- `deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net scripts/verify_test.ts scripts/verify_integration_test.ts` — passed.
- `deno task verify:integration` without credentials — fails as designed, naming required real-service variables and never selecting mocks.
- `npm --prefix gui run test:unit` — 29 passed.
- `npm --prefix gui run validate:storybook-docs` — 24 files validated.
- `npm --prefix gui run build` — passed with network access for Google Fonts.
- `npm --prefix gui run build-storybook` — passed.
- `npm --prefix gui run test-storybook -- --run` — 89 passed.
- `git diff --check` — passed.

## MAI-87 green-gate evidence
- MAI-87 completed the prerequisite local-gate repairs on `chore/MAI-87-deno-verification`; it supersedes the prior failure blocker.
- `deno task verify` — exit 0. Component summary: PASS Deno tests, GUI unit tests, Next.js production build, Storybook documentation, Storybook build, and Storybook interaction tests.
- Deno coverage: `DENO_ENV=test deno test --quiet --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net` — 135 passed, 0 failed; the canonical include list retains all supported conventions under `tests/`, `src/`, and `scripts/`.
- `verify:integration` rejects absent or placeholder PostgreSQL, Gemini, and Papermark configuration without mocks, then runs a real Transformers smoke when prerequisites are supplied.

## Remaining owner action
- Resume MAI-79 finalization after human review and a real-service `deno task verify:integration` run with PostgreSQL, Gemini, Papermark, and network access.

## Scope correction from MAI-87
- The PostgreSQL, Papermark, and Gemini integrations are not yet implemented or configured, so no live `verify:integration` run can be required at this stage.
- MAI-79/MAI-87 prove the canonical local gate and that the future integration profile fails safely without mocks. Executing that profile belongs to the future provider-integration tasks, not to MAI-79 finalization.

## MAI-87 completion verification
- MAI-87 was merged into this branch at `db04a9b` and is now Done.
- The canonical `deno task verify` gate completed with the recorded PASS component summary: Deno tests, GUI unit tests, Next.js production build, Storybook documentation, Storybook build, and Storybook interaction tests.
- MAI-87 recorded 135 passing Deno tests, 29 GUI unit tests, 24 validated Storybook MDX files, and 89 passing Storybook interaction tests.
- The explicit integration profile rejects absent or placeholder PostgreSQL, Gemini, and Papermark configuration without selecting mocks.
- PR #4 is the MAI-79 review PR. MAI-79 remains In Progress pending human review and approval; no live-provider pass is claimed.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 The aggregate gate passes from a clean checkout with documented prerequisites
- [x] #2 A controlled failing check proves that failures propagate to the final exit code
- [x] #3 No test suite is excluded solely because of its directory or filename convention
<!-- DOD:END -->
