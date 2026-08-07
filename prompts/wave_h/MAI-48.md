# MAI-48 — Negotiation

**Skill:** `$solve-mai`\
**Wave:** H

Read `prompts/OPERATING_RULES.md` and `## Wave H execution plan — MAI-48` in local
`AGENTS.md`; never commit the plan. Invoke `$solve-mai MAI-48`.

## Execution policy

Apply `prompts/OPERATING_RULES.md`. Default to one accountable agent. Delegate only when the work is genuinely separable and materially faster; if delegated, follow `prompts/SUBAGENT_RULES.md`.

## Suggested safe slice categories

- Proposals
- Counterproposals
- Term comparison
- Alternatives and optimization integration
- Approval authority
- Persistence/API
- Concurrency and audit tests

## Focus

Deliver negotiation rounds, proposals, normalized terms, internal
positions/BATNA, mandate comparison, approvals, and a separate authorized
delivery job using MAI-20 and MAI-21.

## Boundary

Do not let agents or optimizers approve, accept, send, release, or finalize
terms.

Use focused`rg`, TDD/security
tests, task checks, and `deno task verify`. Set In Progress, record exact
evidence and rollback, open a PR containing MAI-48, never self-merge, and do
not mark Done.
