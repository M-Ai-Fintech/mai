# MAI-42 — Closing control

**Skill:** `$solve-mai`\
**Wave:** G

Read `prompts/OPERATING_RULES.md` and `## Wave G execution plan — MAI-42` in local
`AGENTS.md`; never commit the plan. Invoke `$solve-mai MAI-42`.

## Execution policy

Apply `prompts/OPERATING_RULES.md`. Default to one accountable agent. Delegate only when the work is genuinely separable and materially faster; if delegated, follow `prompts/SUBAGENT_RULES.md`.

## Focus

Deliver closing conditions, checklist items, waivers, readiness, signature
evidence, closing packages, and irreversible confirmation controls; consume the
MAI-21 dispute contract where applicable.

## Boundary

Do not certify e-signature providers or allow AI waiver/signature/closing
authority.

Use focused`rg`,
TDD/irreversibility tests, task checks, and `deno task verify`. Set In Progress,
record evidence, open a PR containing MAI-42, never self-merge, and do not mark
Done.
