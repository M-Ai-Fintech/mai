# Finish — Wave H: Negotiation

Read `prompts/OPERATING_RULES.md` and Linear completion context.

**Run only after:** the MAI-48 PR is owner-approved and merged.

Require clean synchronized master and merged PR evidence. Inspect merged source
and the full task; verify internal/external DTO separation, mandate comparison,
human approval, delivery authorization/idempotency, MAI-20/147 integration,
ACs, DoD, and tests.

## Execution policy

Use one accountable finisher. Parallel read-only review is exceptional and must be genuinely separable and materially faster; use `prompts/SUBAGENT_RULES.md` only when justified.

Run focused checks and `deno task verify`. Do not repair feature code. When
green, run one `graphify update .` and `git diff --check`.

Use Linear issue/document tools to mark MAI-48 Done only when every gate passes. Do not
move to completed. Remove only merged worktree/branch. Commit Linear/Graphify
changes as `docs: close delivery wave H`, push master, and confirm no feature
implementation occurred.
