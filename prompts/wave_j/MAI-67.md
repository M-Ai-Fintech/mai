# MAI-67 — Audited agent feedback, evaluation, and offline improvement

**Skill:** `$solve-mai`

Read `prompts/OPERATING_RULES.md` and `## Wave J execution plan — MAI-67` in local
`AGENTS.md`; never commit it. Invoke `$solve-mai MAI-67`.

## Execution policy

Apply `prompts/OPERATING_RULES.md`. Default to one accountable agent. Delegate only when the work is genuinely separable and materially faster; if delegated, follow `prompts/SUBAGENT_RULES.md`.

## Focus

Deliver immutable feedback linked to exact agent execution, classification,
authorization, dataset eligibility, versioned offline evaluation datasets,
regression suites, governed promotion records, and rollback.

## Boundary

Do not implement runtime self-learning, automatic prompt/tool/model mutation, or
treat feedback as authoritative policy/fact.

Use focused`rg`,
privacy/lineage/regression tests and `deno task verify`. Set In Progress, record
evidence, open a PR containing MAI-67, never self-merge, and do not mark Done.
