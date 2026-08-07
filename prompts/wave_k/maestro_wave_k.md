# Maestro — Wave K: Final dependent side lanes


Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-68` — Retire the legacy banker-facing CLI and preserve bounded operator
  tooling
- `MAI-69` — Evaluate and approve a governed Brazilian M&A model-adaptation
  strategy

## Entry gate

Wave J is closed and every declared dependency for MAI-68 and MAI-69 is Done.

Require clean synchronized master, active To Do tasks with `delivery-wave-k`,
and no duplicate work.

Create:

- `delivery/MAI-68-retire-legacy-banker-cli` at
  `../mai-worktrees/wave_k/MAI-68`;
- `delivery/MAI-69-governed-brazilian-ma-model-adaptation-strategy` at
  `../mai-worktrees/wave_k/MAI-69`.

Plan both with focused `rg`; eliminate collisions; write
`## Wave K execution plan — <TASK-ID>` in local `AGENTS.md`; persist with
the Linear issue description or plan metadata; keep uncommitted/`skip-worktree`; leave To Do until
implementation starts. Use `prompts/OPERATING_RULES.md` for each plan's model
route; record a written deep architecture, security, or planning justification
if Sol is selected.

Return base, gates, worktrees, plans, collisions, parallel launch, merge order,
blockers, and confirmation no implementation or Graphify ran.

## Execution policy

Use one coordinator and do not spawn implementation workers from a planning prompt. Delegation is exceptional; apply `prompts/OPERATING_RULES.md` and record a concrete reason before proposing it.
