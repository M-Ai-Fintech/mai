# Maestro — Wave G: Core business slices

**Role:** create worktrees, plan, and hand off. Do not implement, merge, or run
Graphify.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-39` — Valuation scenarios and approval
- `MAI-41` — Matching, conflicts and shortlist
- `MAI-42` — Closing control
- `MAI-43` — Deliverables, redaction, release and exports
- `MAI-44` — Pause, archive, restore, termination, retention and deletion

## Entry gate

Wave F is closed and the relevant Wave A algorithm contracts are Done. Every
declared dependency must be Done.

Run Linear workspace and issue/project context, require clean synchronized master, verify active
To Do tasks with `delivery-wave-g`, and rule out duplicate
branches/worktrees/PRs.

| Task    | Branch                                                                      | Worktree                          | Prompt       |
| ------- | --------------------------------------------------------------------------- | --------------------------------- | ------------ |
| MAI-39 | `delivery/MAI-39-valuation-scenarios-and-approval`                         | `../mai-worktrees/wave_g/MAI-39` | `MAI-39.md` |
| MAI-41 | `delivery/MAI-41-matching-conflicts-and-shortlist`                         | `../mai-worktrees/wave_g/MAI-41` | `MAI-41.md` |
| MAI-42 | `delivery/MAI-42-closing-control`                                          | `../mai-worktrees/wave_g/MAI-42` | `MAI-42.md` |
| MAI-43 | `delivery/MAI-43-deliverables-redaction-release-and-exports`               | `../mai-worktrees/wave_g/MAI-43` | `MAI-43.md` |
| MAI-44 | `delivery/MAI-44-pause-archive-restore-termination-retention-and-deletion` | `../mai-worktrees/wave_g/MAI-44` | `MAI-44.md` |

Create all from one verified master commit. Plan with focused `rg`; eliminate
collisions; write `## Wave G execution plan — <TASK-ID>` into local root
`AGENTS.md`; persist with the Linear issue description or plan metadata; keep uncommitted/`skip-worktree`;
leave To Do until implementation starts. Use `prompts/OPERATING_RULES.md` for the model route and record a written deep architecture, security, or planning justification if Sol is selected.

Return base, gates, matrix, plans, collision analysis, parallel groups, merge
order, blockers, and confirmation no implementation or Graphify ran.

## Execution policy

Use one coordinator and do not spawn implementation workers from a planning prompt. Delegation is exceptional; apply `prompts/OPERATING_RULES.md` and record a concrete reason before proposing it.
