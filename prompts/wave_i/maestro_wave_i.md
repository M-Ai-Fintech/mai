# Maestro — Wave I: Governed agents and providers

**Model:** 5.6 Terra Medium\
**Role:** create worktrees, plan, and hand off. Do not implement, merge, or run
Graphify.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-121` — Governed agent definitions and tools
- `MAI-127` — Integration adapters and certification

## Entry gate

Wave H is closed; every task-specific domain prerequisite for MAI-121 and
MAI-127 is Done.

Run Backlog overview/execution, require clean synchronized master, verify both
tasks are active To Do with `delivery-wave-i`, and rule out duplicate
branches/worktrees/PRs.

| Task    | Branch                                                    | Worktree                          | Prompt       |
| ------- | --------------------------------------------------------- | --------------------------------- | ------------ |
| MAI-121 | `delivery/MAI-121-governed-agent-definitions-and-tools`   | `../mai-worktrees/wave_i/MAI-121` | `MAI-121.md` |
| MAI-127 | `delivery/MAI-127-integration-adapters-and-certification` | `../mai-worktrees/wave_i/MAI-127` | `MAI-127.md` |

Create both from one verified master commit. Inspect with focused `rg`,
eliminate overlap, write local `AGENTS.md` plan sections, persist through
Backlog `planSet`, keep uncommitted/`skip-worktree`, and leave To Do until Luna
starts.

## Sol planning exceptions

- `MAI-121` → `plan_MAI-121.md`
- `MAI-127` → `plan_MAI-127.md`

Run both with 5.6 Sol High before Luna. Return base, gates, matrix, plans,
collision analysis, parallel groups, merge order, blockers, and confirmation no
implementation or Graphify ran.

## Required within-task delegation design

For each task plan, define:

- authoritative task coordinator;
- proposed read-only subagents;
- proposed writing slices;
- one concrete `/goal` draft per proposed subagent;
- exclusive paths per writing slice;
- forbidden shared paths;
- coordinator-owned shared and integration files;
- maximum concurrent subagents;
- maximum concurrent writers;
- slice dependencies;
- integration order;
- slice-level checks;
- final task-wide verification.

Do not spawn implementation subagents from the maestro. The maestro plans the
delegation model; the Luna task coordinator executes it after the task start
gate.
