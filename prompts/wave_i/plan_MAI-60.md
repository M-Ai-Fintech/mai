# Plan MAI-60 — Governed agent definitions and tools

**Purpose:** planning only; implementation follows the route in `prompts/OPERATING_RULES.md`.

Inside the MAI-60 worktree, Read `prompts/OPERATING_RULES.md`, the full task,
agent/human-authority docs, agent definitions, schemas, tools, runtime ports,
tests, and legacy learning/fine-tuning/VDR paths. Do not implement, commit, open
a PR, branch, or run Graphify. Use focused `rg`.

Plan definition versioning, capability-specific ToolGateway contracts,
authorization-before-load, provenance, output schemas, migration of eight
agents, prohibited effects, removal/fencing of self-learning and fake
model-adaptation tools, tests, compatibility, rollback, and file ownership.

## Execution policy

Plan for one accountable implementation agent by default. Propose delegation only when genuinely separable and materially faster; if justified, include exclusive paths, forbidden shared paths, checks, integration order, and stop conditions under `prompts/SUBAGENT_RULES.md`.

Write `## Wave I execution plan — MAI-60` in local `AGENTS.md`, persist with
the Linear issue description or plan metadata, keep uncommitted/`skip-worktree`, and return the
implementation handoff.
