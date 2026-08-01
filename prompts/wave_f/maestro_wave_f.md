# Maestro — Wave F: Decisions, agent runtime, and access

**Model:** 5.6 Terra Medium  
**Role:** create worktrees, plan, and hand off. Do not implement, merge, or run Graphify.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-115` — Findings, impacts and decisions
- `MAI-120` — Agent mission and run platform
- `MAI-124` — Deal team and external-participant access

## Entry gate

Wave E is closed; all task-specific dependencies through MAI-114 are Done. Every declared dependency remains authoritative.

Run Backlog overview/execution instructions, fetch `origin/master`, require clean synchronized master, verify tasks are active To Do with `delivery-wave-f`, and rule out duplicate branches/worktrees/PRs.

| Task | Branch | Worktree | Prompt |
|---|---|---|---|
| MAI-115 | `delivery/MAI-115-findings-impacts-and-decisions` | `../mai-worktrees/wave_f/MAI-115` | `MAI-115.md` |
| MAI-120 | `delivery/MAI-120-agent-mission-and-run-platform` | `../mai-worktrees/wave_f/MAI-120` | `MAI-120.md` |
| MAI-124 | `delivery/MAI-124-deal-team-and-external-participant-access` | `../mai-worktrees/wave_f/MAI-124` | `MAI-124.md` |

Create all from the same verified master commit. For each worktree, inspect with focused `rg`, eliminate file collisions, write `## Wave F execution plan — <TASK-ID>` in local root `AGENTS.md`, persist with Backlog `planSet`, keep it uncommitted/`skip-worktree`, and leave To Do until Luna starts.

## Sol planning exception

- `MAI-120` → `plan_MAI-120.md` with 5.6 Sol High.

Use Terra for the other plans. Return base, gates, matrix, plans, collision analysis, parallel groups, merge order, blockers, and confirmation no implementation or Graphify ran.
