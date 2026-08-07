# MAI-68 — Retire the legacy banker-facing CLI

**Skill:** `$solve-mai`

Read `prompts/OPERATING_RULES.md` and `## Wave K execution plan — MAI-68` in local
`AGENTS.md`; never commit it. Invoke `$solve-mai MAI-68`.

## Execution policy

Apply `prompts/OPERATING_RULES.md`. Default to one accountable agent. Delegate only when the work is genuinely separable and materially faster; if delegated, follow `prompts/SUBAGENT_RULES.md`.

## Focus

Remove the banker-facing legacy CLI and obsolete command registrations while
preserving explicitly bounded operator/admin tooling, migration evidence, and
replacement workflows.

## Boundary

Do not remove necessary operational tools, historical evidence, or
frontend/backend capabilities still awaiting cutover.

Use focused`rg`, regression
tests and `deno task verify`. Set In Progress, record evidence, open a PR
containing MAI-68, never self-merge, and do not mark Done.
