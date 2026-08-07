---
id: MAI-155
title: Adapt repository execution and verification policy after Wave E
status: In Progress
assignee:
  - '@codex'
created_date: '2026-08-07 01:27'
updated_date: '2026-08-07 02:23'
labels:
  - maintenance
  - governance
  - testing
  - developer-experience
  - prompt-framework
dependencies: []
modified_files:
  - >-
    backlog/docs/governance/document-inventory/doc-12 -
    Documentation-Inventory-and-Classification.md
  - >-
    backlog/docs/index/doc-10 -
    Documentation-Index-and-Information-Architecture.md
  - >-
    backlog/docs/operations/local-setup/doc-8 -
    Local-Setup-and-Runtime-Operations.md
  - deno.json
  - prompts
  - scripts
  - tests
priority: high
ordinal: 132000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adapt the MA&I repository’s execution system to the Post-Wave-E operating policy. Centralize model routing, Fast mode expectations, single-agent defaults, repair/restart judgment, time and usage guidance, test sequencing, environment prewarming, approved Git/database operations, migration integrity, semantic writing exceptions, canonical verification behavior, and lifecycle rules. Simplify active prompts to task-specific context while preserving security, ownership, migration, and state-transition constraints. Strengthen idempotent preflight, reusable isolated PostgreSQL test state, migration-path checks, deterministic standards checks, and canonical-runner reporting. This is repository infrastructure and policy work only; do not begin Wave F, headroom, Next.js 16.3, Supabase, Papermark, or any product/domain behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 One canonical execution policy documents the requested model routing, Fast mode default, runtime model-identity authority, single-agent default, justified multi-agent use, time/checkpoint and usage principles, repair-versus-restart choice, approved operations, and lifecycle rules.
- [ ] #2 Active prompt files reference the central policy and retain only task-specific context, scope, constraints, verification, state transitions, and /goal material; no important security, migration, ownership, or state rules are lost.
- [ ] #3 Repository preflight is idempotent, fail-early, and documents or checks Docker/PostgreSQL, approved test targets, Deno and GUI dependency readiness, browser dependencies where required, authorized Git capability, and an extensible future-provider hook.
- [ ] #4 PostgreSQL verification reuses a persistent service and isolated semantic test state, keeps database-marked tests serialized where required, and clearly separates the approved test target from development, staging, and production.
- [ ] #5 Migration verification covers clean bootstrap and historical upgrade paths and rejects mutation of applied migration bytes, with regression evidence for historical checksums where applicable.
- [ ] #6 Writing and structure checks favor focused code while allowing semantic-integrity exceptions for immutable migrations, SQL, generated artifacts, schemas, fixtures, snapshots, protocols, and declarative mappings.
- [ ] #7 Deterministic quality checks cover high-signal repository policies without brittle broad parsing, including task-ID runtime resources and required database-test suppression where applicable.
- [ ] #8 The canonical runner preflights, fails fast on missing prerequisites, distinguishes required and optional checks, rejects ignored required database tests, handles child timeouts cleanly, preserves useful concurrency, and emits human and machine-readable terminal summaries.
- [ ] #9 Focused regression tests and relevant tooling checks pass, followed by one fresh canonical verification when the environment is available; exact unavailable-prerequisite evidence is retained otherwise.
- [ ] #10 Governed documentation and Backlog evidence make the policy discoverable without beginning Wave F or creating intermediate E-to-F feature tasks, and the direct-to-master worktree is clean after commit and push.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm synchronized clean master, read applicable repository governance, query existing Graphify context, and inventory active prompts, verification runners, Docker/PostgreSQL helpers, migration ledgers, and existing deterministic quality checks.
2. Establish one central prompts/OPERATING_RULES.md contract for Luna Max/Fast default routing, runtime model authority, single-agent and justified delegation rules, time/usage checkpoints, repair-versus-restart assessment, staged testing, prewarming, approved operations, semantic-integrity exceptions, migration immutability, and lifecycle closure. Update prompts/README.md, SUBAGENT_RULES.md, manifest.json, and active task/maestro/planner/finisher prompts to reference it while preserving task-specific boundaries and excluding Wave F feature execution.
3. Improve repository preflight and canonical verification in scripts/ and deno.json with idempotent environment readiness checks, explicit approved PostgreSQL target/configuration, required-versus-optional handling, serial database category behavior, clean timeout/terminal summaries, machine-readable output, and targeted regression tests.
4. Improve PostgreSQL test support without replacing PostgreSQL or destroying the persistent service by reusing isolated semantic databases/state and retaining serial execution for database-marked tests; add focused lifecycle/isolation regression coverage and clear documentation.
5. Add clean-bootstrap and historical-upgrade migration verification plus historical checksum protection, and add precise standards checks with semantic-integrity exceptions for immutable/declarative/generated artifacts and high-signal resource/test-policy violations.
6. Run focused prompt/schema/documentation, runner/preflight, PostgreSQL, migration, and standards checks after each meaningful slice; diagnose failures by category and avoid duplicate canonical runs.
7. Prepare the environment, run one fresh canonical DENO_ENV=test deno task verify, repair introduced failures, record exact evidence in Backlog, update governed documentation inventory/ownership metadata, commit directly on master, push master, verify remote/local equality and a clean worktree, and leave E→F feature work deferred.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Initial discovery 2026-08-07: clean master at bd6c532 matched origin/master; graphify query confirmed existing verification, preflight, PostgreSQL support, and migration-runner relationships. Existing MAI-151, MAI-79, and MAI-154 records were read as adjacent historical context; no existing post-Wave-E policy task matched.

Execution boundary: one primary agent on master, no sub-agents or independent review swarm unless separable work is later proven materially faster; no Wave transition, Wave F/headroom/Next.js/Supabase/Papermark work.

Focused infrastructure evidence 2026-08-07: deno fmt/check passed for changed TypeScript; the focused preflight, PostgreSQL state, canonical-runner, migration-integrity, repository-standards, and verification suites passed 31/31. Repository standards, migration integrity, documentation checks, git diff --check, and npm --prefix gui run lint passed.

Environment evidence 2026-08-07: deno task prepare/preflight passed with the persistent postgres-integration-test service and both approved databases. Port 55432 was occupied by the unrelated MAI-106 container, so this task used explicit local port 55435 without stopping or recreating that container. Full Deno category passed 630 tests, 0 failures, 1 existing parallel ignored smoke test, and all 54 serialized PostgreSQL files passed with 0 ignored required tests.

Governed documentation evidence 2026-08-07: Backlog MCP updated doc-8 local setup/prewarming, doc-10 navigation, and doc-12 inventory for prompts/OPERATING_RULES.md, README.md, SUBAGENT_RULES.md, and manifest.json. Final canonical verification and direct master commit/push remain pending.

Final canonical evidence 2026-08-07: POSTGRES_INTEGRATION_TEST_PORT=55435 with both approved database URLs; deno task verify passed all 21 required categories. Deno category passed in 238344 ms; preflight, docs, resource naming, migration integrity, repository standards, GUI unit, Next build, workflows, Storybook documentation/build/interactions all passed. No optional failure was reported.

The task remains In Progress pending owner-controlled closure; no Wave transition or E-to-F feature task was created.
<!-- SECTION:NOTES:END -->
