# Maestro — Wave F: Decisions, agent runtime, and access

**Role:** create worktrees, plan, and hand off. Do not implement, merge, or run
Graphify.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-115` — Findings, impacts and decisions
- `MAI-120` — Agent mission and run platform
- `MAI-124` — Deal team and external-participant access

## Entry gate

Wave E is closed; all task-specific dependencies through MAI-114 are Done. Every
declared dependency remains authoritative.

Run Backlog overview/execution instructions, fetch `origin/master`, require
clean synchronized master, verify tasks are active To Do with `delivery-wave-f`,
and rule out duplicate branches/worktrees/PRs.

| Task    | Branch                                                       | Worktree                          | Prompt       |
| ------- | ------------------------------------------------------------ | --------------------------------- | ------------ |
| MAI-115 | `delivery/MAI-115-findings-impacts-and-decisions`            | `../mai-worktrees/wave_f/MAI-115` | `MAI-115.md` |
| MAI-120 | `delivery/MAI-120-agent-mission-and-run-platform`            | `../mai-worktrees/wave_f/MAI-120` | `MAI-120.md` |
| MAI-124 | `delivery/MAI-124-deal-team-and-external-participant-access` | `../mai-worktrees/wave_f/MAI-124` | `MAI-124.md` |

Create all from the same verified master commit. For each worktree, inspect with
Use focused`rg`, eliminate file collisions, write
`## Wave F execution plan — <TASK-ID>` in local root `AGENTS.md`, persist with
Backlog `planSet`, keep it uncommitted/`skip-worktree`, and leave To Do until
implementation starts. Use `prompts/OPERATING_RULES.md` for every plan's model
route; record a written deep architecture, security, or planning justification
if Sol is selected. Return base, gates, matrix, plans, collision
analysis, parallel groups, merge order, blockers, and confirmation no
implementation or Graphify ran.

## Execution policy

Use one coordinator and do not spawn implementation workers from a planning prompt. Delegation is exceptional; apply `prompts/OPERATING_RULES.md` and record a concrete reason before proposing it.
