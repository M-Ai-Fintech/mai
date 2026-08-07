Context

Wave I contains Linear issues MAI-60 — Governed agent definitions and tools, and MAI-61 — Integration adapters and certification. Linear native relations and `prompts/manifest.json` are authoritative. Read the operating policy, README, both full issues, and their deep-plan prompts before planning.

Objective

Prepare Wave I without implementing: verify Wave H and task dependencies, create both task worktrees from one master SHA, coordinate the required deep plans, eliminate ownership collisions, and hand off safe parallel execution.

Relevant scope / architecture

Create `delivery/MAI-60-governed-agent-definitions-and-tools` and `delivery/MAI-61-integration-adapters-and-certification` under `../mai-worktrees/wave_i/`. MAI-60 owns governed definitions/tools; MAI-61 owns provider adapters/readiness. Keep shared provider/domain boundaries explicit.

Run `plan_MAI-60.md` and `plan_MAI-61.md` as planning-only handoffs where their deep-plan criteria remain justified. Persist Wave I execution plans in Linear and local `AGENTS.md` according to repository convention.

Known risks or constraints

Do not implement, set issues In Progress, open implementation PRs, merge, or run Graphify. Provider credentials and environment evidence are prerequisites, not assumptions. Do not let MAI-60 claim provider readiness or MAI-61 claim domain authority.

Expected verification

Confirm clean synchronized master, MAI-60/61 Todo with all dependencies Done, no duplicate branch/worktree/PR, exact shared base SHA, deep-plan evidence, collision-free ownership, safe parallel grouping, and merge order.

Return base SHA, gates, worktree matrix, plan summaries, provider prerequisites, collision/ownership analysis, merge order, blockers, and confirmation no implementation or Graphify ran.

Allowed state transitions

Planning only. Leave MAI-60 and MAI-61 Todo. Do not change wave/dependency state.

/goal
