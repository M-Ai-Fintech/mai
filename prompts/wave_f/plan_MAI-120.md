# Plan MAI-120 — Agent mission and run platform

**Model:** 5.6 Sol High  
**Purpose:** planning only; implementation remains 5.6 Luna Max.

Run inside the MAI-120 worktree. Read `prompts/OPERATING_RULES.md`, the complete Backlog task, governed docs, applicable `AGENTS.md`, current agent runtime, jobs, persistence, auth, tests, and consumers. Do not implement, commit, open a PR, branch, or run Graphify. Use focused `rg`.

Plan the durable Mission/Run platform: records and state machines, job/lease recovery, step/tool/result/artifact lineage, reauthorization, cancellation/retry, stale invalidation, cost/model metadata, compatibility and rollback. Preserve the boundary against specialist definitions, unrestricted tools, and direct side effects.

Replace the local placeholder with `## Wave F execution plan — MAI-120`, including outcome, evidence, slices, exclusive files, tests/failure injection, migration/rollback, risks/checkpoints, and exclusions. Persist with Backlog `planSet`, keep `AGENTS.md` uncommitted and `skip-worktree`, then return the Luna handoff.
