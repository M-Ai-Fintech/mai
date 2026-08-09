Context

The authoritative execution policy is `prompts/OPERATING_RULES.md`; read it before execution.

Wave J contains Linear issues MAI-64 and MAI-65 only. MAI-66 and MAI-67 are post-MVP and must not be planned or executed in this wave. Linear native relations and `prompts/manifest.json` are authoritative. Read the operating policy, README, both full issues, and `plan_MAI-64.md` before planning.

Objective

Prepare the Wave J MVP work without implementing: verify Wave I and task dependencies, create isolated worktrees from one master SHA, plan collision-free ownership, and hand off safe parallel implementation and merge order for MAI-64 and MAI-65.

Relevant scope / architecture

MAI-64 owns frontend adapter cutover and MAI-65 owns governed model-backed financial-risk integration. Create their registered `delivery/MAI-*` branches under `../mai-worktrees/wave_j/`.

Run the MAI-64 deep-plan prompt where justified. Persist `## Wave J execution plan — <TASK-ID>` in Linear and local `AGENTS.md` according to repository convention. Reserve shared frontend registries and cross-task integration to exactly one owner.

Known risks or constraints

Do not implement, set issues In Progress, open implementation PRs, merge, or run Graphify during planning. Do not start MAI-66, MAI-67, MAI-70, MAI-81, MAI-82, or MAI-83. Prevent MAI-64 frontend shared-file races and keep production-only certification outside the MVP wave.

Expected verification

Confirm clean synchronized master, MAI-64 and MAI-65 Todo with valid dependencies, no duplicate work, exact shared base SHA, plan persistence, collision/ownership matrix, safe parallel groups, and merge order.

Allowed state transitions

Planning only. Leave MAI-64 and MAI-65 Todo and all post-MVP issues unchanged.

/goal
