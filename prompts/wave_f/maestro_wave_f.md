# Maestro — Wave F: Decisions, agent runtime, and access

**Role:** create worktrees, plan, and hand off. Do not implement, merge, or run
Graphify.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-31` — Findings, impacts and decisions
- `MAI-32` — Agent mission and run platform
- `MAI-33` — Deal team and external-participant access

## Entry gate

Wave E is closed; all task-specific dependencies through MAI-29 are Done. Every
declared dependency remains authoritative.

Run Linear workspace and issue/project context, fetch `origin/master`, require
clean synchronized master, verify tasks are active To Do with `delivery-wave-f`,
and rule out duplicate branches/worktrees/PRs.

| Task    | Branch                                                       | Worktree                          | Prompt       |
| ------- | ------------------------------------------------------------ | --------------------------------- | ------------ |
| MAI-31 | `delivery/MAI-31-findings-impacts-and-decisions`            | `../mai-worktrees/wave_f/MAI-31` | `MAI-31.md` |
| MAI-32 | `delivery/MAI-32-agent-mission-and-run-platform`            | `../mai-worktrees/wave_f/MAI-32` | `MAI-32.md` |
| MAI-33 | `delivery/MAI-33-deal-team-and-external-participant-access` | `../mai-worktrees/wave_f/MAI-33` | `MAI-33.md` |

Create all from the same verified master commit. For each worktree, inspect with
Use focused`rg`, eliminate file collisions, write
`## Wave F execution plan — <TASK-ID>` in local root `AGENTS.md`, persist with
the Linear issue description or plan metadata, keep it uncommitted/`skip-worktree`, and leave To Do until
implementation starts. Use `prompts/OPERATING_RULES.md` for every plan's model
route; record a written deep architecture, security, or planning justification
if Sol is selected. Return base, gates, matrix, plans, collision
analysis, parallel groups, merge order, blockers, and confirmation no
implementation or Graphify ran.

## Execution policy

Use one coordinator and do not spawn implementation workers from a planning prompt. Delegation is exceptional; apply `prompts/OPERATING_RULES.md` and record a concrete reason before proposing it.
