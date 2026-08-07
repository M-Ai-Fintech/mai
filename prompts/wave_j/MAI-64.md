# MAI-64 — Frontend adapter migration

**Skill:** `$solve-mai`

Read `plan_MAI-64.md` first and use the central model route. Read `prompts/OPERATING_RULES.md` and
`## Wave J execution plan — MAI-64` in local `AGENTS.md`; never commit it.
Invoke `$solve-mai MAI-64`.

## Execution policy

Apply `prompts/OPERATING_RULES.md`. Default to one accountable agent. Delegate only when the work is genuinely separable and materially faster; if delegated, follow `prompts/SUBAGENT_RULES.md`.

## Suggested safe slice categories

- Global screen adapters
- Deal-intelligence adapters
- Deal-execution adapters
- Administration/external adapters
- API-client integration
- Shared route/adapter integration
- Parity/accessibility/workflow verification

Keep shared frontend registries and API-client foundations coordinator-owned
unless the plan assigns one explicit single owner.

## Focus

Replace fixture-backed GUI data behind typed adapters family by family while
preserving all approved routes, screen states, Figma behavior, errors, stale
states, and permissions.

## Boundary

Do not redesign visuals/workflows, delete Storybook fixtures, or bypass backend
v1 contracts.

Use focused`rg`, GUI
contract/parity/accessibility tests and `deno task verify`. Set In Progress,
record evidence, open a PR containing MAI-64, never self-merge, and do not mark
Done.
