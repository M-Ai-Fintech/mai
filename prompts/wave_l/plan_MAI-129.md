# Plan MAI-129 — Data migration and MVP retirement

**Model:** 5.6 Sol High. Planning only; implementation remains Luna Max.

Inside the MAI-129 worktree, read operating rules, full task/history, migration ADRs, all replacement tasks, current migrations, stores, routes, schemas, fixtures, adapters, agents, VDR/optimizer/CLI retirement notes, tests, and consumers. Do not implement, commit, open a PR, branch, or run Graphify. Use focused `rg`.

Create the exclusive cutover plan: inventory legacy writers/readers, target mappings, import/dual-read/reconciliation, idempotency, manifests, thresholds, feature flags, consumer migration, staged cutover, rollback windows, evidence preservation, physical retirement ordering, failure recovery, and operator runbooks. Prevent any other task from owning migration/cutover files.

Write `## Wave L execution plan — MAI-129` in local `AGENTS.md`, persist with Backlog `planSet`, keep uncommitted/`skip-worktree`, and return the Luna handoff.
