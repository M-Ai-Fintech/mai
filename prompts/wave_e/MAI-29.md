# MAI-29 — Workstreams, tasks and approval requests

**Skill:** `$solve-mai`\
**Wave:** E — Work management

Read `prompts/OPERATING_RULES.md`. Work only in the maestro-created worktree.
Read:

```markdown
## Wave E execution plan — MAI-29
```

Stop if absent or inconsistent; never stage or commit the plan. Invoke
`$solve-mai MAI-29`.

## Execution policy

Apply `prompts/OPERATING_RULES.md`. Default to one accountable agent. Delegate only when the work is genuinely separable and materially faster; if delegated, follow `prompts/SUBAGENT_RULES.md`.

## Suggested safe slice categories

- Workstream lifecycle
- Task lifecycle
- Approval Request lifecycle
- Approver authority/separation of duties
- Persistence and transactional evidence
- API/projections
- PostgreSQL/concurrency testing

## Focus

Deliver Workstream and Task state machines plus exact-version Approval Request
packages, named approvers, separation of duties, withdrawal, and target-command
dispatch.

## Boundary

Do not implement domain-specific approval outcomes or bypass human authority.

Use focused `rg`, source/tests,
governed docs, and Linear issue/document tools. Set In Progress when work starts. Follow the
plan, use TDD/regression tests and `deno task verify`, record exact evidence,
open a PR containing `MAI-29`, never self-merge, and do not mark Done.

Return branch, plan, implementation, files, tests, Linear evidence, PR, and
human actions.
