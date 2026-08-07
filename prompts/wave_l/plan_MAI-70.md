# Plan MAI-70 — Data migration and MVP retirement


Inside the MAI-70 worktree, Read `prompts/OPERATING_RULES.md`, full task/history, migration
ADRs, all replacement tasks, current migrations, stores, routes, schemas,
fixtures, adapters, agents, VDR/optimizer/CLI retirement notes, tests, and
consumers. Do not implement, commit, open a PR, or branch. Use
Use focused`rg`.

Create the exclusive cutover plan: inventory legacy writers/readers, target
mappings, import/dual-read/reconciliation, idempotency, manifests, thresholds,
feature flags, consumer migration, staged cutover, rollback windows, evidence
preservation, physical retirement ordering, failure recovery, and operator
runbooks. Prevent any other task from owning migration/cutover files.

## Execution policy

Plan for one accountable implementation agent by default. Propose delegation only when genuinely separable and materially faster; if justified, include exclusive paths, forbidden shared paths, checks, integration order, and stop conditions under `prompts/SUBAGENT_RULES.md`.

Write `## Wave L execution plan — MAI-70` in local `AGENTS.md`, persist with
the Linear issue description or plan metadata, keep uncommitted/`skip-worktree`, and return the
implementation handoff.
