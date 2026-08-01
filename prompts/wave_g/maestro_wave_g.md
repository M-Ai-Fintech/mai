# Maestro — Wave G: Core business slices

**Model:** 5.6 Terra Medium  
**Role:** create worktrees, plan, and hand off. Do not implement, merge, or run Graphify.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-116` — Valuation scenarios and approval
- `MAI-117` — Matching, conflicts and shortlist
- `MAI-119` — Closing control
- `MAI-122` — Deliverables, redaction, release and exports
- `MAI-125` — Pause, archive, restore, termination, retention and deletion

## Entry gate

Wave F is closed and the relevant Wave A algorithm contracts are Done. Every declared dependency must be Done.

Run Backlog overview/execution, require clean synchronized master, verify active To Do tasks with `delivery-wave-g`, and rule out duplicate branches/worktrees/PRs.

| Task | Branch | Worktree | Prompt |
|---|---|---|---|
| MAI-116 | `delivery/MAI-116-valuation-scenarios-and-approval` | `../mai-worktrees/wave_g/MAI-116` | `MAI-116.md` |
| MAI-117 | `delivery/MAI-117-matching-conflicts-and-shortlist` | `../mai-worktrees/wave_g/MAI-117` | `MAI-117.md` |
| MAI-119 | `delivery/MAI-119-closing-control` | `../mai-worktrees/wave_g/MAI-119` | `MAI-119.md` |
| MAI-122 | `delivery/MAI-122-deliverables-redaction-release-and-exports` | `../mai-worktrees/wave_g/MAI-122` | `MAI-122.md` |
| MAI-125 | `delivery/MAI-125-pause-archive-restore-termination-retention-and-deletion` | `../mai-worktrees/wave_g/MAI-125` | `MAI-125.md` |

Create all from one verified master commit. Plan with focused `rg`; eliminate collisions; write `## Wave G execution plan — <TASK-ID>` into local root `AGENTS.md`; persist with Backlog `planSet`; keep uncommitted/`skip-worktree`; leave To Do until Luna starts. No Sol exceptions.

Return base, gates, matrix, plans, collision analysis, parallel groups, merge order, blockers, and confirmation no implementation or Graphify ran.
