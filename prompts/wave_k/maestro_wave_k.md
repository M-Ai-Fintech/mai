# Maestro — Wave K: Final dependent side lanes

**Model:** 5.6 Terra Medium. Do not implement, merge, or run Graphify.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-150` — Retire the legacy banker-facing CLI and preserve bounded operator
  tooling
- `MAI-153` — Evaluate and approve a governed Brazilian M&A model-adaptation
  strategy

## Entry gate

Wave J is closed and every declared dependency for MAI-150 and MAI-153 is Done.

Require clean synchronized master, active To Do tasks with `delivery-wave-k`,
and no duplicate work.

Create:

- `delivery/MAI-150-retire-legacy-banker-cli` at
  `../mai-worktrees/wave_k/MAI-150`;
- `delivery/MAI-153-governed-brazilian-ma-model-adaptation-strategy` at
  `../mai-worktrees/wave_k/MAI-153`.

Plan both with Terra and focused `rg`; eliminate collisions; write
`## Wave K execution plan — <TASK-ID>` in local `AGENTS.md`; persist with
Backlog `planSet`; keep uncommitted/`skip-worktree`; leave To Do until Luna
starts. No Sol exceptions.

Return base, gates, worktrees, plans, collisions, parallel launch, merge order,
blockers, and confirmation no implementation or Graphify ran.

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
