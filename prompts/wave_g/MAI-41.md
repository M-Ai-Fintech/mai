# MAI-41 — Matching, conflicts and shortlist

**Skill:** `$solve-mai`\
**Wave:** G

Read `prompts/OPERATING_RULES.md` and `## Wave G execution plan — MAI-41` in local
`AGENTS.md`; never commit the plan. Invoke `$solve-mai MAI-41`.

## Execution policy

Apply `prompts/OPERATING_RULES.md`. Default to one accountable agent. Delegate only when the work is genuinely separable and materially faster; if delegated, follow `prompts/SUBAGENT_RULES.md`.

## Focus

Deliver matching criteria/runs/candidates, conflicts/restrictions, shortlist,
and outreach-authorization state machines using MAI-19 pure algorithms.

## Boundary

Do not send outreach, expose restricted candidates, or encode KYC/compliance
policy in the optimizer.

Use focused`rg`, TDD/security
tests, task checks, and `deno task verify`. Set In Progress, record evidence,
open a PR containing MAI-41, never self-merge, and do not mark Done.
