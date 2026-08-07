# Maestro — Wave M: Release gate


Read `prompts/OPERATING_RULES.md`.

## Task

- `MAI-71` — End-to-end, security and operational release gate

## Entry gate

Wave L is closed; MAI-64, MAI-61, MAI-70, MAI-22, and MAI-23 are Done, and
every declared dependency is Done.

Require clean synchronized master, MAI-71 active To Do with `delivery-wave-m`,
and no duplicate release-gate branch or PR.

Create `delivery/MAI-71-end-to-end-security-and-operational-release-gate` at
`../mai-worktrees/wave_m/MAI-71` from verified master.

Plan using `prompts/OPERATING_RULES.md` and focused `rg`: workflow/E2E, roles and external isolation,
human authority, concurrency/idempotency, jobs/recovery, audit reconstruction,
provider failures, backup/restore, operational evidence, P0/P1 handling, and
final production-candidate decision. Write `## Wave M execution plan — MAI-71`
in local `AGENTS.md`, persist with the Linear issue description or plan metadata, keep
uncommitted/`skip-worktree`, and leave To Do until implementation starts.

Return base, gate, worktree, plan/test-stream matrix, blockers, and confirmation
no implementation or Graphify ran.

## Execution policy

Use one coordinator and do not spawn implementation workers from a planning prompt. Delegation is exceptional; apply `prompts/OPERATING_RULES.md` and record a concrete reason before proposing it.
