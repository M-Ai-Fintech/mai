# Maestro — Wave J: Cutover consumers and governance evidence


Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-64` — Frontend adapter migration
- `MAI-65` — Governed model-backed financial-risk integration
- `MAI-66` — Enterprise security, privacy, and compliance readiness evidence
- `MAI-67` — Audited agent feedback, evaluation, and offline improvement

## Entry gate

Wave I is closed and every declared dependency is Done.

Require clean synchronized master, active To Do tasks with `delivery-wave-j`,
and no duplicate branch/worktree/PR.

| Task    | Branch                                                              | Worktree                          | Prompt       |
| ------- | ------------------------------------------------------------------- | --------------------------------- | ------------ |
| MAI-64 | `delivery/MAI-64-frontend-adapter-migration`                       | `../mai-worktrees/wave_j/MAI-64` | `MAI-64.md` |
| MAI-65 | `delivery/MAI-65-governed-model-backed-financial-risk-integration` | `../mai-worktrees/wave_j/MAI-65` | `MAI-65.md` |
| MAI-66 | `delivery/MAI-66-enterprise-readiness-evidence`                    | `../mai-worktrees/wave_j/MAI-66` | `MAI-66.md` |
| MAI-67 | `delivery/MAI-67-audited-agent-feedback-and-offline-improvement`   | `../mai-worktrees/wave_j/MAI-67` | `MAI-67.md` |

Create all from one verified master commit. Plan with focused `rg`, eliminate
collisions, write `## Wave J execution plan — <TASK-ID>` in local `AGENTS.md`,
persist with the Linear issue description or plan metadata, keep uncommitted/`skip-worktree`, and leave To
Do until implementation starts. Use `prompts/OPERATING_RULES.md` for every
plan's model route; record a written deep architecture, security, or planning
justification if Sol is selected.

Return base, gates, matrix, plans, collision analysis, parallel groups, merge
order, blockers, and confirmation no implementation or Graphify ran.

## Execution policy

Use one coordinator and do not spawn implementation workers from a planning prompt. Delegation is exceptional; apply `prompts/OPERATING_RULES.md` and record a concrete reason before proposing it.
