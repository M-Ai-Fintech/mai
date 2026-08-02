---
id: MAI-151
title: Establish a fast deterministic developer preflight for the modular monolith
status: In Progress
assignee: []
created_date: '2026-07-31 17:33'
updated_date: '2026-08-02 03:48'
labels:
  - backend
  - architecture
  - testing
  - developer-experience
  - reliability
  - preflight
  - mvp
  - delivery-wave-a
milestone: m-12
dependencies:
  - MAI-79
  - MAI-106
references:
  - 'https://github.com/luisfelipeluis49/mai/pull/42'
modified_files:
  - deno.json
  - scripts/verify_fast.ts
  - scripts/verify_fast_manifest.ts
  - scripts/verify_fast_test.ts
  - scripts/verify_fast_benchmark.ts
  - scripts/verify_fast_benchmark_test.ts
  - tests/platform/events/inbox_contract.spec.ts
  - tests/unit/deal_terminology_contract.spec.ts
  - tests/unit/target_dossier_contract.spec.ts
  - >-
    backlog/docs/operations/local-setup/doc-8 -
    Local-Setup-and-Runtime-Operations.md
priority: high
ordinal: 10900
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a fast deterministic developer preflight for the approved MAI modular monolith.

The preflight provides inexpensive local and CI feedback before the complete canonical verification gate.

It is not:
- a banker-facing CLI command;
- a substitute for `deno task verify`;
- a substitute for `deno task verify:integration`;
- a real PostgreSQL, Gemini, Papermark, Transformers, identity-provider, VDR, cloud, or production health check;
- permission to report unavailable dependencies as healthy;
- permission to use silent mocks.

MAI-79 remains the authoritative complete repository gate.

The explicit integration profile remains the authority for real configured providers and infrastructure.

MAI-151 owns:
- a documented fast preflight command;
- an explicit manifest of included checks;
- deterministic fixture selection;
- offline execution;
- minimum permissions;
- bounded modular-monolith contract checks;
- clear component-level failure output;
- measured execution budget;
- prevention of static or fabricated "healthy" reports.

Relationships:
- Supersedes: MAI-3
- Complements: MAI-79
- Dependency of: MAI-131
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 One documented command exists, preferably: deno task verify:fast or an equivalently clear non-product name.
- [ ] #2 The command is explicitly developer/operator tooling and is not registered as a banker-facing interactive CLI command.
- [ ] #3 The command runs with network access disabled.
- [ ] #4 The command does not require a live PostgreSQL server.
- [ ] #5 The command does not require Gemini, Papermark, Transformers downloads, cloud credentials, VDR credentials, or identity-provider credentials.
- [ ] #6 Every fixture, fake, or in-memory adapter used by the preflight is selected explicitly and labelled as a test adapter.
- [ ] #7 A failed live dependency must not silently cause selection of a fixture adapter.
- [ ] #8 The included-check manifest covers the currently approved fast critical boundaries, including as applicable: core API contract parsing; authorization policy evaluation; Deal terminology enforcement; deterministic workflow transitions; persistence contract types; durable-job state mechanics; outbox/inbox contract mechanics; Target Dossier proposal boundary; term-sheet contract separation; DomainArea and RiskSeverity contracts.
- [ ] #9 The preflight excludes checks that require: live providers; external network access; production builds; Storybook browser execution; cloud infrastructure; long-running model downloads.
- [ ] #10 Excluded checks are documented and remain covered by deno task verify, deno task verify:integration, or their owning implementation tasks.
- [ ] #11 The command reports each component as: passed; failed; skipped by explicit manifest; unavailable by explicit configuration.
- [ ] #12 It never prints a static "database healthy", "network healthy", "provider healthy", or equivalent message without executing the corresponding real check.
- [ ] #13 Any failed included component causes a non-zero final exit code.
- [ ] #14 The command uses only the minimum required Deno permissions.
- [ ] #15 The command is deterministic for identical repository state and fixture inputs.
- [ ] #16 A controlled failing test proves failure propagation.
- [ ] #17 A reference-runner benchmark records at least ten runs.
- [ ] #18 The initial p95 execution target is no more than five seconds on the documented reference runner.
- [ ] #19 The five-second target is not represented as a universal cross-machine SLA.
- [ ] #20 Documentation explains the difference between: fast preflight; canonical repository verification; live integration verification; deployed environment health checks.
- [ ] #21 Focused tests and deno task verify pass.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory deno.json, scripts/verify.ts, tests/smoke.spec.ts, and MAI-106 platform contract tests; define the included fast-check manifest and explicitly documented exclusions.
2. Implement an offline developer/operator-only verify:fast runner with explicit deterministic test adapters, minimum Deno permissions, component statuses, and fail-closed dependency handling.
3. Add deterministic, permission-boundary, manifest, controlled-failure, and ten-run benchmark tests/evidence without changing banker-facing CLI or canonical/integration gates.
4. Run focused checks and deno task verify, record exact evidence and limitations, then prepare a human-reviewable Draft PR without marking the task Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Record:
- The existing tests/smoke.spec.ts and test:smoke task are migration evidence, not automatically the target design.
- Existing useful deterministic tests may be adapted rather than discarded.
- The MvpStore lifecycle alone is not sufficient preflight coverage.
- Real provider and infrastructure checks belong to the explicit integration and deployment gates.
- MAI-150 remains responsible for retiring the legacy product CLI.

Do not check acceptance criteria during task creation.

Discovery evidence (2026-08-02): the current platform/API, authorization, persistence, durable-job, outbox-dispatch, operations-contract, smoke, term-sheet, DomainArea, RiskSeverity, architecture-contract, and MvpStore tests ran offline with Deno permissions limited to read plus environment access; the combined run reached 89 passed before the existing target_dossier_memory.spec.ts failed on ONNX FFI permission. A second run without environment permission reached 88 passed before the existing deal_terminology_enforcement repository-construction test failed while reading DATABASE_URL. The fast manifest will therefore use pure schema/contract coverage for Target Dossier and Deal terminology, exclude ONNX/model and repository/database paths, and pass no network, FFI, write, or live-provider permissions. The failed dependency paths are excluded explicitly rather than falling back to fixtures.

Implementation and focused verification evidence (2026-08-02): added `deno task verify:fast` and `deno task verify:fast:benchmark`. The fast runner executes 11 included deterministic test-adapter components in parallel, reports 5 explicit skips and 2 explicit unavailable statuses, and passes child tests with `--allow-read` only; the runner has `--allow-read --allow-run` and no network, write, env, FFI, provider, database, or model-download permission. `deno task verify:fast` exited 0. `deno test --no-prompt --allow-read --allow-run scripts/verify_fast_test.ts scripts/verify_fast_benchmark_test.ts tests/platform/events/inbox_contract.spec.ts tests/unit/deal_terminology_contract.spec.ts tests/unit/target_dossier_contract.spec.ts` exited 0 with 16 passed. The controlled-failure case exited 1 and reported `FAILED Core API contract parsing`. `deno task verify:fast:benchmark` recorded 10 runs on linux/x86_64 with Deno 2.9.3: 4035, 4047, 4264, 4052, 3912, 3956, 3851, 3993, 4363, and 3965 ms; p95 4363 ms, local target passed. `deno fmt --check`, `deno check`, and `git diff --check` exited 0.

Canonical gate evidence (2026-08-02): the completed sandbox run `time deno task verify` exited 1 after 45.239s. It passed Canonical documentation, I18n Strings Check, Deno tests, Frontend design tokens, Frontend component boundary, Frontend shell boundary, Frontend screen families, Frontend deal intelligence screens, Frontend deal execution screens, Frontend Figma-to-code conformance, and Storybook documentation. It failed only environment/tooling-dependent GUI checks: `spawnSync git EPERM` in frontend foundation, missing `vitest`, missing `next`, missing `playwright`, missing `storybook`, and the resulting GUI workflow/build/interaction checks. An escalated rerun was stopped with Ctrl-C after 3m05.578s when live test paths produced no completion status; it is not verification evidence. The canonical gate is therefore not passing and remains an owner/environment follow-up; MAI-151 stays In Progress and is not Done.

PR handoff blocker (2026-08-02): local commit `84d915d` was created successfully on `delivery/MAI-151-fast-developer-preflight`. `git push -u origin delivery/MAI-151-fast-developer-preflight` was rejected by the execution safety reviewer because it would externally transmit repository source and task data to `https://github.com/luisfelipeluis49/mai`. No push or PR was created. Explicit owner approval of that exact remote destination is required before continuing; task remains In Progress.

Draft PR #42 created: https://github.com/luisfelipeluis49/mai/pull/42. Branch delivery/MAI-151-fast-developer-preflight is pushed with commits 174cb6f and 84d915d. Owner review is pending; task remains In Progress and no merge or Done transition was performed.

PR review hardening (2026-08-02): added --cached-only and --frozen to both fast tasks and every child test command, scoped runner reads to the repository and subprocess execution to Deno, and added tests for the dependency-resolution boundary. The runner now caps included checks at four concurrent components, applies a 5000 ms component timeout, terminates timed-out Deno children, and reports timeout failures as FAILED. Benchmark coverage now asserts every included manifest ID executes exactly ten times. Hardened network-disabled benchmark on linux/x86_64 with Deno 2.9.3 and a pre-populated cache: 1225, 1199, 1162, 1193, 1086, 1129, 1128, 1140, 1114, 1129 ms; p95 1225 ms, target passed. Focused cached/frozen tests exited 0 with 19 passed. Canonical deno task verify rerun exited 1 after 35.770s: documentation, backend Deno tests, and static GUI checks passed; environment-only GUI checks failed on sandbox spawnSync git EPERM and missing vitest, next, playwright, and storybook. Task remains In Progress; canonical gate is not claimed as passing.

Final post-refactor evidence (2026-08-02): deno task verify:fast exited 0 with 11 passed, 0 failed, 5 skipped, and 2 unavailable under cached/frozen, scoped permissions. Focused cached/frozen tests exited 0 with 19 passed. The final network-disabled ten-run benchmark on linux/x86_64 with Deno 2.9.3 recorded 1135, 1137, 1187, 1148, 1125, 1109, 1153, 1121, 1124, and 1136 ms; p95 1187 ms, target passed. The final canonical deno task verify rerun exited 1 after 34.331s because the environment still lacks GUI tooling and blocks git subprocesses; this remains a non-pass and owner follow-up.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Every acceptance criterion is checked with current evidence.
- [ ] #2 The preflight command is documented and reproducible.
- [ ] #3 The included and excluded check manifests are explicit.
- [ ] #4 Offline and minimum-permission execution is proven.
- [ ] #5 Deterministic fixtures cannot be selected through silent production fallback.
- [ ] #6 Controlled failure propagation is proven.
- [ ] #7 Reference-runner timing evidence is recorded.
- [ ] #8 MAI-131 depends on MAI-151.
- [ ] #9 MAI-79 remains the authoritative complete verification gate.
- [ ] #10 No banker-facing CLI command was introduced.
- [ ] #11 The canonical repository verification gate passes.
<!-- DOD:END -->
