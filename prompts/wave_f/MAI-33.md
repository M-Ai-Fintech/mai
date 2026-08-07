# MAI-33 — Deal team and external-participant access

**Skill:** `$solve-mai`\
**Wave:** F

Read `prompts/OPERATING_RULES.md`, work only in the maestro-created worktree,
and read `## Wave F execution plan — MAI-33` from local `AGENTS.md`. Never
commit that plan. Invoke `$solve-mai MAI-33`.

## Execution policy

Apply `prompts/OPERATING_RULES.md`. Default to one accountable agent. Delegate only when the work is genuinely separable and materially faster; if delegated, follow `prompts/SUBAGENT_RULES.md`.

## Focus

Deliver Deal Participation, purpose-bound external grants, sponsor/expiry,
portal object scope, submissions/receipts, revocation, and offboarding.

## Boundary

Do not conflate institution membership with Deal participation or expose
internal findings/negotiation strategy.

Use focused `rg`, governed docs,
source/tests, and Linear issue/document tools. Set In Progress, follow the plan, use
TDD/security leakage tests and `deno task verify`, record exact evidence, open a
PR containing MAI-33, never self-merge, and do not mark Done.
