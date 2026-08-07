# Finish — Wave K: Final dependent side lanes

Read `prompts/OPERATING_RULES.md` and Linear completion context.

owner-approved and merged.

Require clean synchronized master and merged PR evidence. Inspect merged source
and records; verify CLI replacement coverage, preserved operator tooling,
evaluation methodology, data governance, formal Go/No-go, ACs, DoD, and tests.

## Execution policy

Use one accountable finisher. Parallel read-only review is exceptional and must be genuinely separable and materially faster; use `prompts/SUBAGENT_RULES.md` only when justified.

Run focused checks and `deno task verify`. Do not repair feature code. When
green, run one `graphify update .` and `git diff --check`.

Use Linear issue/document tools to mark issues Done only when every gate passes. Do not move
to completed. Remove only merged worktrees/branches. Commit Linear/Graphify
changes as `docs: close delivery wave K`, push master, and confirm no feature
implementation occurred.
