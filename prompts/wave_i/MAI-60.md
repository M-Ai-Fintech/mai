# MAI-60 — Governed agent definitions and tools

**Skill:** `$solve-mai`\
**Wave:** I

Read `prompts/OPERATING_RULES.md`. Read `plan_MAI-60.md` first and use the central model route. Work only in the
maestro-created worktree and read `## Wave I execution plan — MAI-60` from
local `AGENTS.md`; never commit the plan. Invoke `$solve-mai MAI-60`.

## Execution policy

Apply `prompts/OPERATING_RULES.md`. Default to one accountable agent. Delegate only when the work is genuinely separable and materially faster; if delegated, follow `prompts/SUBAGENT_RULES.md`.

## Suggested safe slice categories

- Governed agent definitions
- Tool permissions
- Domain tool adapters
- Mission/run integration
- Evaluation
- Audit and security review

## Focus

Migrate governed agent definitions and eight specialist agents to versioned
schemas and ToolGateway read/proposal capabilities with provenance and
human-boundary regression tests.

## Boundary

Do not grant approval, send, invite, permission, release, archive, delete,
waiver, signature, self-learning, or fake fine-tuning capabilities.

Use focused`rg`, TDD/security
tests, task checks, and `deno task verify`. Set In Progress, record evidence,
open a PR containing MAI-60, never self-merge, and do not mark Done.
