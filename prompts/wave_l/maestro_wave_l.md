Context

Wave L contains Linear issue MAI-70 — Data migration and MVP retirement. Linear native relations and `prompts/manifest.json` are authoritative. Read the operating policy, README, full issue/history, and `plan_MAI-70.md` before planning.

Objective

Prepare the exclusive MAI-70 migration/cutover worktree and executable plan without performing migration or retirement.

Relevant scope / architecture

Create `delivery/MAI-70-data-migration-and-mvp-retirement` at `../mai-worktrees/wave_l/MAI-70` from synchronized master. The plan must inventory every legacy writer/reader, target mapping, migration, dual-read/write path, reconciliation rule, consumer cutover, compatibility path, retirement candidate, cutoff, rollback window, operator step, and exclusive file.

Run `plan_MAI-70.md` as the deep planning handoff where justified. Persist `## Wave L execution plan — MAI-70` in Linear and local `AGENTS.md` according to repository convention.

Known risks or constraints

Do not implement, set MAI-70 In Progress, open its implementation PR, merge, run Graphify, or mutate migration/cutover files during planning. MAI-70 must remain the sole migration/cutover owner; destructive ordering must be serial.

Expected verification

Confirm Wave K closed, every MAI-70 dependency/consumer cutover Done, clean synchronized master, MAI-70 Todo, no duplicate migration owner/branch/worktree/PR, exact base SHA, persisted deep plan, exclusive ownership proof, rollback/reconciliation gates, and no implementation changes.

Allowed state transitions

Planning only. Leave MAI-70 Todo and MAI-71 unchanged.

/goal
