# Maestro — Wave L: Migration and retirement


Read `prompts/OPERATING_RULES.md`.

## Task

- `MAI-129` — Data migration and MVP retirement

## Entry gate

Wave K is closed; all MAI-129 dependencies and consumer cutovers are Done.

Require clean synchronized master, MAI-129 active To Do with `delivery-wave-l`,
and no duplicate migration/cutover owner.

Create `delivery/MAI-129-data-migration-and-mvp-retirement` at
`../mai-worktrees/wave_l/MAI-129` from verified master.

Read `plan_MAI-129.md` first and use `prompts/OPERATING_RULES.md` for its model route; record a written deep architecture, security, or planning justification if Sol is selected. The final plan must inventory every
migration, dual-read/write, reconciliation, consumer, compatibility path,
retirement candidate, cutoff, rollback window, and exclusive file. Write
`## Wave L execution plan — MAI-129` in local `AGENTS.md`, persist with Backlog
`planSet`, keep uncommitted/`skip-worktree`, and leave To Do until implementation starts.

Return base, gates, worktree, plan, exclusive-ownership proof, blockers, and
confirmation no implementation or Graphify ran.

## Execution policy

Use one coordinator and do not spawn implementation workers from a planning prompt. Delegation is exceptional; apply `prompts/OPERATING_RULES.md` and record a concrete reason before proposing it.
