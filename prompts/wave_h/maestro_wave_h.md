Context

Wave H contains Linear issue MAI-48 — Negotiation. Linear native relations and `prompts/manifest.json` are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, and the full MAI-48 issue before planning.

Objective

Prepare MAI-48 execution without implementing: verify Wave G and all declared dependencies are Done, create the isolated negotiation worktree from synchronized master, produce the Linear-backed execution plan, and hand off one coherent task coordinator.

Relevant scope / architecture

Create `delivery/MAI-48-negotiation` at `../mai-worktrees/wave_h/MAI-48`. Plan proposal/counterproposal lifecycle, terms, internal position/BATNA, MAI-20 optimization, MAI-21 dispute integration, approval authority, delivery boundary, persistence/API, concurrency, and audit ownership.

Persist `## Wave H execution plan — MAI-48` in Linear plan metadata and local `AGENTS.md` according to repository convention. Include any justified within-task delegation design with disjoint paths and serial integration.

Known risks or constraints

Do not implement, set MAI-48 In Progress, open an implementation PR, merge, or run Graphify. Do not start from an unmerged Wave G branch. Shared delivery/provider or closing ownership must not be pulled into MAI-48.

Expected verification

Confirm clean synchronized master, MAI-48 Todo with valid native dependencies, no duplicate branch/worktree/PR, exact base SHA, persisted execution plan, ownership/collision analysis, and no implementation changes.

Return base SHA, gate, branch/worktree, plan summary, delegation/ownership design if justified, blockers, and confirmation no implementation or Graphify ran.

Allowed state transitions

Planning only. Leave MAI-48 Todo and all downstream issues unchanged. Do not perform Wave H closure.

/goal
