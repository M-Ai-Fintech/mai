Context

Wave G contains Linear issues MAI-39, MAI-41, MAI-42, MAI-43, and MAI-44. Linear native relations and `prompts/manifest.json` are authoritative. Read `prompts/OPERATING_RULES.md` and `prompts/README.md` before planning.

Objective

Prepare Wave G execution without implementing: verify entry gates, create one isolated branch/worktree per task from the same synchronized master SHA, produce Linear-backed execution plans, eliminate file collisions, and hand off safe parallel groups and merge order.

Relevant scope / architecture

Entry requires Wave F closed and every task-specific dependency Done. Use branches/worktrees already registered in the manifest conventions: MAI-39 valuation, MAI-41 matching, MAI-42 closing, MAI-43 deliverables, and MAI-44 deal governance.

For each task, inspect only enough source and governed context to define outcome, ownership, exclusive paths, coordinator-owned shared paths, risks, focused checks, and integration order. Persist `## Wave G execution plan — <TASK-ID>` in the Linear issue plan metadata and local task `AGENTS.md` as repository convention requires.

Known risks or constraints

Do not implement, set tasks In Progress, open implementation PRs, merge, run Graphify, or bypass a Linear dependency gate. All task worktrees must start from one verified master SHA. Shared-file collisions must have one explicit owner before handoff.

Do not spawn implementation workers from the maestro. If future task delegation is justified, plan it under `SUBAGENT_RULES.md`; execution belongs to the task coordinator.

Expected verification

Confirm clean synchronized master, all five issues Todo with correct wave labels/relations, no duplicate branches/worktrees/PRs, exact worktree base SHA, plan persistence in Linear, collision analysis, safe parallel groups, and merge order.

Return the base SHA, gate results, branch/worktree matrix, task-plan summaries, collision/ownership matrix, parallel launch groups, merge order, blockers, and confirmation that no implementation or Graphify ran.

Allowed state transitions

Planning only. Leave MAI-39, MAI-41, MAI-42, MAI-43, and MAI-44 Todo. Do not change dependency relations or wave status. Do not commit feature or Graphify changes.

/goal
