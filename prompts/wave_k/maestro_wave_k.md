Context

The authoritative execution policy is `prompts/OPERATING_RULES.md`; read it before execution.

Wave K contains Linear issue MAI-68 — Retire the legacy banker-facing CLI and preserve bounded operator tooling. MAI-69 is post-MVP and must not be planned or executed in this wave. Linear native relations and `prompts/manifest.json` are authoritative.

Objective

Prepare MAI-68 without implementing: verify Wave J and task dependencies, create its isolated worktree from synchronized master, inventory supported product and operator CLI surfaces, and hand off the bounded retirement plan.

Relevant scope / architecture

Create `delivery/MAI-68-retire-legacy-banker-cli` under `../mai-worktrees/wave_k/MAI-68`. MAI-68 owns banker-facing CLI retirement only; it does not own post-MVP data migration, provider certification, or product feature implementation.

Persist `## Wave K execution plan — MAI-68` in Linear and local `AGENTS.md` according to repository convention. Prove replacement coverage through the approved frontend/API/application-service paths before physical removal.

Known risks or constraints

Do not implement, set MAI-68 In Progress, open an implementation PR, merge, or run Graphify during planning. Do not start MAI-69, MAI-70, MAI-81, MAI-82, or MAI-83. Preserve bounded operator/migration/diagnostic tooling where justified.

Expected verification

Confirm clean synchronized master, MAI-68 Todo with MAI-64 completed, no duplicate work, exact base SHA, inventory and replacement-coverage plan, exclusive ownership, rollback boundaries, and no implementation changes.

Allowed state transitions

Planning only. Leave MAI-68 Todo and all post-MVP issues unchanged.

/goal
