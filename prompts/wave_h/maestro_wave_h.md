# Maestro — Wave H: Negotiation

**Model:** 5.6 Terra Medium\
**Role:** create worktrees, plan, and hand off. Do not implement, merge, or run
Graphify.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-118` — Negotiation

## Entry gate

Wave G is closed; MAI-146 and MAI-147 are Done. Every declared dependency must
be Done.

Run Backlog overview/execution, require clean synchronized master, verify
MAI-118 is active To Do with `delivery-wave-h`, and rule out duplicate work.

Create `delivery/MAI-118-negotiation` in `../mai-worktrees/wave_h/MAI-118`. Plan
with focused `rg`, write `## Wave H execution plan — MAI-118` in local root
`AGENTS.md`, persist with Backlog `planSet`, keep it
uncommitted/`skip-worktree`, and leave the task To Do until Luna starts. No Sol
exception.

Return base, gate, branch/worktree, plan, collisions, blockers, and confirmation
no implementation or Graphify ran.

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
