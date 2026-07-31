---
id: MAI-83
title: Audit and remove code rot and obsolete repository artifacts
status: Done
assignee:
  - '@antigravity'
created_date: '2026-07-22 05:24'
updated_date: '2026-07-25 01:31'
labels:
  - cleanup
  - architecture
  - code-rot
milestone: m-14
dependencies: []
references:
  - 'https://github.com/M-Ai-Fintech/MVP/pull/7'
priority: medium
ordinal: 75000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Run the code-rot-cleaner workflow in report-only mode first, then conservatively prove and remove approved dead code, orphan modules, duplicate implementations, stale scripts, obsolete validators, generated-looking artifacts, and unnecessary files. The broken Stitch validation script/reference is an explicit candidate. Discovery is not permission to delete.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A deterministic report is generated under outputs/code-rot-cleaner/ with every candidate classified as SAFE TO REMOVE, REVIEW, or KEEP
- [x] #2 Framework routes, dynamic imports, registries, CLI entry points, migrations, tests, and deployment conventions are checked before classifying candidates
- [x] #3 Removal proof is performed only in disposable copies and only after approval to run the named project commands
- [x] #4 The Stitch validator and any package-script reference to its missing implementation are evaluated as explicit candidates
- [x] #5 Real repository deletions occur only after candidate-by-candidate approval naming exact IDs and paths
- [x] #6 Approved cleanup is followed by the repository-wide verification gate and an inspected, scope-limited diff
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Discovery & Audit completed. Report at outputs/code-rot-cleaner/report.md.
2. Owner approved candidate removals: S1-S11 (all SAFE TO REMOVE) and R1, R2, R3, R4, R5, R6, R8 (REVIEW items selected for removal). R7 (GUI storybook components) kept.
3. Perform file deletions and config updates (deno.json, gui/package.json).
4. Run verification gates: deno task verify and gui npm tests.
5. Inspect diff and record final summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Discovery Complete

### Report
Deterministic report generated at `outputs/code-rot-cleaner/report.md`:
- **11 SAFE TO REMOVE** candidates (S1–S11)
- **8 REVIEW** candidates (R1–R8)
- All KEEP items documented with rationale

### Checks performed (AC#2)
- deno.json task entry points and import maps
- gui/package.json scripts, deps, devDeps
- git ls-files tracking
- Import graph analysis (grep across src/, tests/, scripts/, gui/)
- Framework conventions: Next.js routes, Storybook MDX, Deno test patterns

### Stitch validator (AC#4)
Already removed in MAI-79. No remaining Stitch scripts in package.json or gui/scripts/.

### Awaiting
Owner candidate-by-candidate approval (AC#5) to proceed with deletions.

## Execution & Verification Complete

### Approved Removals
- S1–S11 (SAFE TO REMOVE): `fix_commits.sh`, `scratch/`, `antigravity_agent.py`, `hybrid.ts`, 4 `deno.json` deps, `entity.vitest.config.ts`, 3 `gui/package.json` devDeps.
- R1, R2, R3, R4, R5, R6, R8 (REVIEW items selected for deletion): `fine_tuning.ts`, `pytorch.ts`, `config.ts`, `e2e_flow.ts`, `benchmark_optimization.ts`, `fine_tuning_lora.py`, `generate_onnx.py`.
- R7 (GUI Storybook components): Kept.

### Verification Results (`deno task verify`)
- PASS Canonical documentation
- PASS I18n Strings Check
- PASS Deno tests
- PASS GUI unit tests
- PASS Next.js production build
- PASS Storybook documentation
- PASS Storybook build
- PASS Storybook interaction tests

### Diff Check (`git diff --check`)
Clean (0 warnings).

## PR Created
Pull Request: https://github.com/M-Ai-Fintech/MVP/pull/7
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Outcome
Executed code-rot audit and approval-gated cleanup for MAI-83.
Report generated under `outputs/code-rot-cleaner/report.md` classifying 11 SAFE TO REMOVE, 8 REVIEW, and KEEP items with evidence.

## Removed Artifacts & Dead Code
- **11 SAFE TO REMOVE**: `fix_commits.sh`, `scratch/` (3 prototype files), `scripts/antigravity_agent.py`, `src/engines/document-generator/hybrid.ts`, `gui/components/screens/entities/entity.vitest.config.ts`, 4 unused `deno.json` imports (`@bubblyworld/highs-ts`, `genetic-search`, `commander`, `@std/cli`), and 3 unused `gui/package.json` devDependencies (`jest-image-snapshot`, `@types/jest-image-snapshot`, `axe-playwright`).
- **7 Approved REVIEW Deletions**: `src/agent/fine_tuning.ts`, `src/engines/prediction/pytorch.ts`, `src/engines/optimization/config.ts`, `src/scripts/e2e_flow.ts`, `scripts/benchmark_optimization.ts`, `scripts/fine_tuning_lora.py`, `generate_onnx.py`.
- **1 Kept REVIEW Group**: GUI Storybook components (ErrorBoundary, Footer, Radio, Spinner) retained in component library.

## Verification
- `deno task verify`: All 8 checks PASSED (Canonical documentation, I18n strings, Deno tests, GUI unit tests, Next.js build, Storybook docs, Storybook build, Storybook interaction tests).
- `git diff --check`: Passed cleanly with 0 warnings.

## Risks & Follow-up
- None identified. Clean, isolated code-rot cleanup.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 The report records removable LOC/bytes, evidence, proof results, residual risk, and rejected candidates
- [x] #2 No unapproved source, documentation, manifest, lockfile, test, or configuration change is made
- [x] #3 All relevant verification commands pass after any approved cleanup batch
<!-- DOD:END -->
