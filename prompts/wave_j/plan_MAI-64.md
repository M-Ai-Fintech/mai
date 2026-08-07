# Plan MAI-64 — Frontend adapter migration


Inside the MAI-64 worktree, Read `prompts/OPERATING_RULES.md`, the full task, approved
Figma/frontend contracts, route and adapter registries, all 25 screen families,
fixtures, tests, and backend v1 APIs. Do not implement, commit, open a PR,
branch, or run Graphify. Use focused `rg`.

Plan family-by-family adapter cutover, typed contracts, flags/rollback,
stale/error/permission states, Storybook fixture preservation, test ownership,
shared registry coordination, and no visual drift.

## Execution policy

Plan for one accountable implementation agent by default. Propose delegation only when genuinely separable and materially faster; if justified, include exclusive paths, forbidden shared paths, checks, integration order, and stop conditions under `prompts/SUBAGENT_RULES.md`.

Write `## Wave J execution plan — MAI-64` in local `AGENTS.md`, persist with
the Linear issue description or plan metadata, keep uncommitted/`skip-worktree`, and return the
implementation handoff.
