# Plan MAI-32 — Agent mission and run platform

**Purpose:** planning only; implementation follows the route in `prompts/OPERATING_RULES.md`.

Run inside the MAI-32 worktree. Read `prompts/OPERATING_RULES.md`, the complete
Linear issue, governed docs, applicable `AGENTS.md`, current agent runtime,
jobs, persistence, auth, tests, and consumers. Do not implement, commit, open a
PR, branch, or run Graphify. Use focused `rg`.

Plan the durable Mission/Run platform: records and state machines, job/lease
recovery, step/tool/result/artifact lineage, reauthorization,
cancellation/retry, stale invalidation, cost/model metadata, compatibility and
rollback. Preserve the boundary against specialist definitions, unrestricted
tools, and direct side effects.

## Execution policy

A plan may propose delegation only when genuinely separable and materially faster. Otherwise record a single-agent plan. If delegation is justified, include exclusive paths, forbidden shared paths, checks, integration order, and stop conditions as required by `prompts/SUBAGENT_RULES.md`.

Replace the local placeholder with `## Wave F execution plan — MAI-32`,
including outcome, evidence, slices, exclusive files, tests/failure injection,
migration/rollback, risks/checkpoints, and exclusions. Persist with Linear
the Linear issue description or plan metadata, keep `AGENTS.md` uncommitted and `skip-worktree`, then return the
implementation handoff.
