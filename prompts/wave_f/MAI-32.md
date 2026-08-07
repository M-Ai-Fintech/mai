# MAI-32 — Agent mission and run platform

**Skill:** `$solve-mai`\
**Wave:** F

Read `prompts/OPERATING_RULES.md`. Read `plan_MAI-32.md` first; use the central model route and record a written deep-plan justification if Sol is selected. Work only in the maestro-created worktree and read
`## Wave F execution plan — MAI-32` from local `AGENTS.md`. Never commit that
plan. Invoke `$solve-mai MAI-32`.

## Execution policy

Apply `prompts/OPERATING_RULES.md`. Default to one accountable agent. Delegate only when the work is genuinely separable and materially faster; if delegated, follow `prompts/SUBAGENT_RULES.md`.

## Suggested safe slice categories

- Mission and Plan
- Run and Step
- Tool Activity and Result
- Artifacts
- Recovery/retry/cancellation
- Reauthorization and invalidation
- Persistence/API/tests

## Focus

Deliver durable Mission, Plan, Run, Step, Tool Activity, Result, and Artifact
records; runner recovery, cancellation/retry, model/cost metadata,
reauthorization, and stale invalidation.

## Boundary

Do not migrate specialist definitions, expose unrestricted tools, or permit
direct side effects.

Use focused `rg`, governed docs,
source/tests, and Linear issue/document tools. Set In Progress, follow the approved
plan, use TDD, recovery/failure tests and `deno task verify`, record exact
evidence, open a PR containing MAI-32, never self-merge, and do not mark Done.
