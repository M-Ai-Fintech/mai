# Maestro — Wave I: Governed agents and providers

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
Backlog `planSet`, keep uncommitted/`skip-worktree`, and leave To Do until
implementation starts.

Use `prompts/OPERATING_RULES.md` for every plan's model route; record a written
deep architecture, security, or planning justification if Sol is selected.
Return base, gates, matrix, plans,
collision analysis, parallel groups, merge order, blockers, and confirmation no
implementation or Graphify ran.

## Execution policy

Use one coordinator and do not spawn implementation workers from a planning prompt. Delegation is exceptional; apply `prompts/OPERATING_RULES.md` and record a concrete reason before proposing it.
