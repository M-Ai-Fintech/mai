# Plan MAI-126 — Frontend adapter migration

**Model:** 5.6 Sol High. Planning only.

Inside the MAI-126 worktree, read operating rules, the full task, approved
Figma/frontend contracts, route and adapter registries, all 25 screen families,
fixtures, tests, and backend v1 APIs. Do not implement, commit, open a PR,
branch, or run Graphify. Use focused `rg`.

Plan family-by-family adapter cutover, typed contracts, flags/rollback,
stale/error/permission states, Storybook fixture preservation, test ownership,
shared registry coordination, and no visual drift.

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

Write `## Wave J execution plan — MAI-126` in local `AGENTS.md`, persist with
Backlog `planSet`, keep uncommitted/`skip-worktree`, and return the Luna
handoff.
