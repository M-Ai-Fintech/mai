# Maestro — Wave H: Negotiation

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
uncommitted/`skip-worktree`, and leave the task To Do until implementation
starts. Use `prompts/OPERATING_RULES.md` for the model route; no
task-specific deep-plan exception is pre-authorized.

Return base, gate, branch/worktree, plan, collisions, blockers, and confirmation
no implementation or Graphify ran.

## Execution policy

Use one coordinator and do not spawn implementation workers from a planning prompt. Delegation is exceptional; apply `prompts/OPERATING_RULES.md` and record a concrete reason before proposing it.
