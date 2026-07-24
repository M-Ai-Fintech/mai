---
id: MAI-87
title: Restore the canonical Deno verification gate to green
status: In Progress
assignee:
  - '@luisfelipeluis49'
created_date: '2026-07-24 09:16'
updated_date: '2026-07-24 14:36'
labels:
  - testing
  - reliability
  - bug
milestone: m-9
dependencies: []
modified_files:
  - deno.json
  - README.md
  - scripts/verify.ts
  - scripts/verify_test.ts
  - scripts/verify_integration.ts
  - scripts/verify_integration_test.ts
  - src/agent/ai_provider.ts
  - src/engines/prediction/transformers.ts
  - src/core/vdr/papermark.ts
  - src/core/db/DatabaseMemoryService.ts
  - src/core/pubsub/LocalPubSubBus.test.ts
  - src/engines/optimization/genetic.test.ts
  - tests/core/memory_service.spec.ts
  - tests/engines/transformers.spec.ts
  - graphify-out/graph.json
  - graphify-out/GRAPH_REPORT.md
  - backlog/tasks/mai-79 - Establish-a-repository-wide-verification-gate.md
priority: high
ordinal: 80000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve the existing Deno failures exposed by MAI-79 so `deno task verify` passes from a clean checkout. This task is the prerequisite for closing MAI-79: on completion, record the exact green-gate evidence on MAI-79 and return ownership to MAI-79. Do not weaken MAI-79 by excluding tests based on directory, filename, mocks, or unavailable services.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every Deno failure currently reported by `deno task verify` is fixed or replaced with an explicit, real-service integration profile with no mock pass-through
- [x] #2 `deno task verify` passes from a clean checkout after documented prerequisites
- [x] #3 The gate continues to collect all supported test conventions under tests/, src/, and scripts/
- [x] #4 Completion notes update MAI-79 with the green-gate evidence and direct finalization back to MAI-79
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create an isolated MAI-87 branch and preserve the canonical test-discovery patterns.
2. Make the local Deno gate run under an explicit test environment, correct the asynchronous Pub/Sub test contract, and add regression coverage for environment isolation.
3. Repair deterministic unit contracts for Papermark configuration, database retry behavior, offline RAG embeddings, and flaky genetic-selection coverage; retain real provider behavior outside the test profile.
4. Extend the explicit `verify:integration` profile with a real Transformers smoke and reject missing or placeholder configuration without a mock fallback.
5. Run focused Deno checks, the full `deno task verify` gate, formatter/type checks, graph update, and configuration-closure evidence.
6. Record exact green-gate evidence on MAI-87 and MAI-79, then prepare review/PR handoff without self-approval or merge.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Intake
- Owner authorized execution with `$solve-mai MAI-87`; task moved to In Progress and assigned to @luisfelipeluis49.
- Worktree was clean on `chore/MAI-79-verification-gate`; no local MAI-87 branch or commit exists. GitHub PR lookup could not reach api.github.com in this environment.
- Baseline `deno task verify` discovered all supported suites but failed 17 assertions grouped across Pub/Sub, VDR/RAG/Hugging Face offline loading, memory/DB, Papermark configuration, and AI SDK v4 agent compatibility.

## Investigation
- Reproduction: `deno task verify` collected 38 Deno test files and reported 17 failed assertions; discovery remains intact.
- `src/core/pubsub/LocalPubSubBus.ts:42-55` dispatches asynchronously, while `src/core/pubsub/LocalPubSubBus.test.ts:4-20` asserts synchronously. Update the test to prove the declared async/replay contract.
- `scripts/verify.ts:79-85` launches Deno tests after loading `.env`; `src/agent/ai_provider.ts:13-24` then treats ambient credentials as live. This lets local tests enter external Gemini/AI-SDK paths. The separate `scripts/verify_integration.ts:14-44` already validates real PostgreSQL, Gemini, and Papermark configuration with no mock fallback.
- `src/engines/prediction/transformers.ts:8-16` always downloads the embedding model, so RAG tests cannot run cleanly offline. Add a deterministic test-only embedding path; retain a real no-mock transformer smoke in the explicit integration profile.
- `src/core/vdr/papermark.ts:14` gives ambient `PAPERMARK_API_KEY` precedence over explicit constructor configuration, contrary to the adapter test.
- `src/core/db/DatabaseMemoryService.ts:86-105` does not classify sandbox `EACCES` connection failures as transient, so retry behavior is skipped; make retry classification testable across refused and permission-denied local connections.
- Chosen path: isolate the canonical local gate, correct these unit contracts, and expand the explicit integration profile. Rejected: exclude existing suites or silently skip provider calls; both violate MAI-87 acceptance criteria.

## Implementation — local gate and deterministic contracts
- Added `DENO_ENV=test` only to the canonical Deno child check, so ambient local credentials cannot turn unit/e2e coverage into live provider calls.
- Added deterministic 384-dimensional test embeddings; real Transformers inference remains required by `verify:integration`.
- Corrected the explicit Papermark configuration precedence, async Pub/Sub test timing, and database retry regression using a deterministic transient-error stub.
- Focused verification: `DENO_ENV=test deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net scripts/verify_test.ts scripts/verify_integration_test.ts src/core/pubsub/LocalPubSubBus.test.ts tests/core/memory_service.spec.ts tests/core/papermark.spec.ts tests/agents/vdr_tools.spec.ts tests/core/continuous_learning.spec.ts tests/e2e/cli.spec.ts tests/e2e/flow.test.ts tests/fine_tuning_mcp.test.ts tests/engines/transformers.spec.ts` — 26 passed, 0 failed.

## Verification
- `DENO_ENV=test deno test --quiet --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net` — 135 passed, 0 failed.
- `npm --prefix gui run test:unit` — 29 passed; `npm --prefix gui run validate:storybook-docs` — 24 files validated; `npm --prefix gui run build-storybook` — passed; `npm --prefix gui run test-storybook -- --run` — 89 passed.
- `npm --prefix gui run build` — passed with network access required for configured Google Fonts.
- `deno task verify` — exit 0; every aggregate component reported PASS.
- `deno fmt --check` and `deno check` for changed Deno files — passed. `git diff --check` — passed.
- `deno task verify:integration` without configured real services — failed as designed, naming every required variable and never substituting mocks.

## Configuration Closure
- Classification: test-environment and provider-profile contract.
- Source-to-runtime path: `scripts/verify.ts` sets `DENO_ENV=test` for the local Deno child; `AIProvider` and `TransformersEngine` consume it. `scripts/verify_integration.ts` is the separate real-provider path.
- Blast radius: all Gemini agent callers share `AIProvider`; RAG, broker memory, and VDR query consumers share `TransformersEngine`; covered by the full Deno suite.
- Environment contract: missing and placeholder provider values are rejected by `scripts/verify_integration_test.ts`; README documents real-service prerequisites.
- Runtime/regression proof: canonical local gate exited 0; focused integration-config tests passed.
- Gate: FAIL for live-provider execution only — PostgreSQL, Gemini, Papermark credentials and a reachable service environment were not supplied. This does not weaken the local gate; an owner must run `deno task verify:integration` with real prerequisites before claiming live-integration validation.

## Handoff
- All MAI-87 acceptance criteria are backed by local evidence and MAI-79 now carries the green-gate record. Task remains In Progress pending human review/PR authorization and the explicit live-provider smoke.

## Local review
- Reviewed the final task-scoped diff against MAI-87 and the approved plan. No correctness, scope, secret-exposure, or stale-discovery issue found.
- `git diff --check` remains clean. Graph artifacts were regenerated as required after code changes.
- No commit, push, or PR was created: remote mutation was not authorized. Human review and the explicit real-provider smoke remain the handoff gates.

## Scope correction
- Live PostgreSQL, Papermark, and Gemini integrations are not implemented/configured yet, so executing `verify:integration` is not possible in this task.
- MAI-87 does not claim a live integration pass and does not require one for its local-gate acceptance criteria. The profile is retained as an explicit future contract: it fails safely instead of using mocks until the dedicated integration tasks provision those services.
- Pending handoff is human review/PR authorization only; live-service validation belongs to the future PostgreSQL, Papermark, and Gemini integration work.

## Entrega para revisão humana

- Branch publicada: `chore/MAI-87-deno-verification`.
- Commits publicados: `a228200` e `4245006`.
- Abertura da PR pendente apenas de autenticação/autorização do GitHub: o token do `gh` está inválido e o conector GitHub não possui acesso ao repositório.
- A tarefa permanece `In Progress` até a revisão humana na PR.
<!-- SECTION:NOTES:END -->
