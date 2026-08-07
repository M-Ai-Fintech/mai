# Finish — Wave M: Release gate

Read `prompts/OPERATING_RULES.md` and Linear completion context.

merged.

Require clean synchronized master and merged PR evidence. Inspect the merged
release dossier and final repository. Re-run or validate all critical workflow,
isolation, authority, concurrency, recovery, provider-failure, backup/restore,
and operational checks. Confirm zero open P0/P1 defects and no automatic
production promotion.

## Execution policy

Use one accountable finisher. Parallel read-only review is exceptional and
must be genuinely separable and materially faster; use
`prompts/SUBAGENT_RULES.md` only when justified.

Run `deno task verify`. Do not repair feature code. When green, run exactly one
`graphify update .` and `git diff --check`.

Using Linear issue/document tools, mark MAI-71 Done only when every AC/DoD and release gate
is proven. Do not move it to completed. Remove only merged worktree/branch.
Commit Linear/Graphify changes as `docs: close delivery wave M`, push master,
and return the production-candidate decision with evidence. Confirm no feature
implementation occurred.
