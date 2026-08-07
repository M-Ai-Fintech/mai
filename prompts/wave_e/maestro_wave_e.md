# Maestro — Wave E: Work management

**Role:** create worktrees, plan, and hand off. Do not implement, merge, or run
Graphify.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-114` — Workstreams, tasks and approval requests

## Entry gate

Wave D is closed; MAI-110 and MAI-111 are Done. Every declared dependency must
be Done.

Run Backlog overview/execution instructions, fetch `origin/master`, require
clean synchronized master, verify MAI-114 is active To Do with
`delivery-wave-e`, and rule out duplicate work.

Create:

| Task    | Branch                                                     | Worktree                          | Prompt       |
| ------- | ---------------------------------------------------------- | --------------------------------- | ------------ |
| MAI-114 | `delivery/MAI-114-workstreams-tasks-and-approval-requests` | `../mai-worktrees/wave_e/MAI-114` | `MAI-114.md` |

From the verified master commit, inspect current behavior with focused `rg`;
write `## Wave E execution plan — MAI-114` into local root `AGENTS.md`; include
outcome, evidence, slices, exclusive files, tests, rollout/rollback,
risks/checkpoints, and exclusions; persist it with Backlog `planSet`; keep it
uncommitted and `skip-worktree`; leave the task To Do until implementation starts.

Use `prompts/OPERATING_RULES.md` for the model route and record a written deep architecture, security, or planning justification if Sol is selected. Return base commit, gate, worktree/branch, plan
status, collision analysis, blockers, and confirmation that no implementation or
Graphify ran.

## Execution policy

Use one coordinator and do not spawn implementation workers from a planning prompt. Delegation is exceptional; apply `prompts/OPERATING_RULES.md` and record a concrete reason before proposing it.
