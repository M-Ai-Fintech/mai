# Maestro — Wave L: Migration and retirement

**Model:** 5.6 Terra Medium. Do not implement, merge, or run Graphify.

Read `prompts/OPERATING_RULES.md`.

## Task

- `MAI-129` — Data migration and MVP retirement

## Entry gate

Wave K is closed; all MAI-129 dependencies and consumer cutovers are Done.

Require clean synchronized master, MAI-129 active To Do with `delivery-wave-l`,
and no duplicate migration/cutover owner.

Create `delivery/MAI-129-data-migration-and-mvp-retirement` at
`../mai-worktrees/wave_l/MAI-129` from verified master.

Run `plan_MAI-129.md` with 5.6 Sol High. The final plan must inventory every
migration, dual-read/write, reconciliation, consumer, compatibility path,
retirement candidate, cutoff, rollback window, and exclusive file. Write
`## Wave L execution plan — MAI-129` in local `AGENTS.md`, persist with Backlog
`planSet`, keep uncommitted/`skip-worktree`, and leave To Do until Luna starts.

Return base, gates, worktree, plan, exclusive-ownership proof, blockers, and
confirmation no implementation or Graphify ran.

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
