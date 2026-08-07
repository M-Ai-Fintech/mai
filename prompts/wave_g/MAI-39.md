# MAI-39 — Valuation scenarios and approval

**Skill:** `$solve-mai`\
**Wave:** G

Read `prompts/OPERATING_RULES.md` and `## Wave G execution plan — MAI-39` in local
`AGENTS.md`; never commit the plan. Invoke `$solve-mai MAI-39`.

## Execution policy

Apply `prompts/OPERATING_RULES.md`. Default to one accountable agent. Delegate only when the work is genuinely separable and materially faster; if delegated, follow `prompts/SUBAGENT_RULES.md`.

## Focus

Deliver versioned valuation models, scenarios, inputs, results, compute
jobs/ports, comparisons, approval, and invalidation using MAI-18 deterministic
algorithms.

## Boundary

Do not allow AI to set price, hide units/rounding, or treat model results as
approved decisions.

Use focused`rg`, TDD/golden
tests, task checks, and `deno task verify`. Set In Progress, record evidence,
open a PR containing MAI-39, never self-merge, and do not mark Done.
