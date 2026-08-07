# Finish — Wave L: Migration and retirement

Read `prompts/OPERATING_RULES.md` and Linear completion context.

merged.

Require clean synchronized master and merged PR evidence. Inspect merged source
and full task; verify exclusive migration ownership, rehearsed
import/reconciliation/cutover/rollback, no remaining prototype
writers/consumers, preserved history/manifests, ACs, DoD, and operator evidence.

## Execution policy

Use one accountable finisher. Parallel read-only review is exceptional and must be genuinely separable and materially faster; use `prompts/SUBAGENT_RULES.md` only when justified.

Run focused migration/recovery checks and `deno task verify`. Do not repair
feature code. When green, run one `graphify update .` and `git diff --check`.

Use Linear issue/document tools to mark MAI-70 Done only when every gate passes. Do not
move to completed. Remove only merged worktree/branch. Commit Linear/Graphify
changes as `docs: close delivery wave L`, push master, and confirm no feature
implementation occurred.
