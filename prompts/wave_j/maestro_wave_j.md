# Maestro — Wave J: Cutover consumers and governance evidence

**Model:** 5.6 Terra Medium. Do not implement, merge, or run Graphify.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-126` — Frontend adapter migration
- `MAI-143` — Governed model-backed financial-risk integration
- `MAI-149` — Enterprise security, privacy, and compliance readiness evidence
- `MAI-152` — Audited agent feedback, evaluation, and offline improvement

## Entry gate

Wave I is closed and every declared dependency is Done.

Require clean synchronized master, active To Do tasks with `delivery-wave-j`, and no duplicate branch/worktree/PR.

| Task | Branch | Worktree | Prompt |
|---|---|---|---|
| MAI-126 | `delivery/MAI-126-frontend-adapter-migration` | `../mai-worktrees/wave_j/MAI-126` | `MAI-126.md` |
| MAI-143 | `delivery/MAI-143-governed-model-backed-financial-risk-integration` | `../mai-worktrees/wave_j/MAI-143` | `MAI-143.md` |
| MAI-149 | `delivery/MAI-149-enterprise-readiness-evidence` | `../mai-worktrees/wave_j/MAI-149` | `MAI-149.md` |
| MAI-152 | `delivery/MAI-152-audited-agent-feedback-and-offline-improvement` | `../mai-worktrees/wave_j/MAI-152` | `MAI-152.md` |

Create all from one verified master commit. Plan with focused `rg`, eliminate collisions, write `## Wave J execution plan — <TASK-ID>` in local `AGENTS.md`, persist with Backlog `planSet`, keep uncommitted/`skip-worktree`, and leave To Do until Luna starts.

## Sol exception

- `MAI-126` → `plan_MAI-126.md` with 5.6 Sol High.

Return base, gates, matrix, plans, collision analysis, parallel groups, merge order, blockers, and confirmation no implementation or Graphify ran.
