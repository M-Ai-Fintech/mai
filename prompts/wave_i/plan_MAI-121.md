# Plan MAI-121 — Governed agent definitions and tools

**Model:** 5.6 Sol High\
**Purpose:** planning only; implementation remains 5.6 Luna Max.

Inside the MAI-121 worktree, read operating rules, the full task,
agent/human-authority docs, agent definitions, schemas, tools, runtime ports,
tests, and legacy learning/fine-tuning/VDR paths. Do not implement, commit, open
a PR, branch, or run Graphify. Use focused `rg`.

Plan definition versioning, capability-specific ToolGateway contracts,
authorization-before-load, provenance, output schemas, migration of eight
agents, prohibited effects, removal/fencing of self-learning and fake
model-adaptation tools, tests, compatibility, rollback, and file ownership.

## Required delegation matrix

The final plan must contain a concrete multi-subagent execution matrix.

For every proposed subagent include:

- role;
- concrete `/goal`;
- read-only or writing classification;
- exclusive paths;
- forbidden paths;
- dependencies;
- required checks;
- expected return artifact;
- integration order;
- stop conditions.

Reserve shared registries, public exports, migration indexes, runtime
composition, task-wide support, Backlog, PR metadata, and Graphify for the task
coordinator unless one explicitly named single owner is safer.

Do not assign overlapping files to multiple writing subagents.

Write `## Wave I execution plan — MAI-121` in local `AGENTS.md`, persist with
Backlog `planSet`, keep uncommitted/`skip-worktree`, and return the Luna
handoff.
