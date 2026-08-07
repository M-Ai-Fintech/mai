# Finish — Wave G: Core business slices

**Run only after:** MAI-39, MAI-41, MAI-42, MAI-43, and MAI-44 PRs are
owner-approved and merged.

Read `prompts/OPERATING_RULES.md` and Linear completion context. Require clean synchronized master
and merged PR evidence. Inspect merged source and records; verify valuation
authority, restricted matching, closing controls, release authorization,
governance/legal holds, ACs, DoD, and meaningful tests.

## Execution policy

Use one accountable finisher. Parallel read-only review is exceptional and must be genuinely separable and materially faster; use `prompts/SUBAGENT_RULES.md` only when justified.

Run focused finance/security/legal/recovery checks and `deno task verify`. Do
not repair feature code. If green, run exactly one `graphify update .` and
`git diff --check`.

Using Linear issue/document tools only, mark issues Done only when every gate passes; do not
move to completed. Remove only merged worktrees/branches. Commit
Linear/Graphify changes as `docs: close delivery wave G`, push master, and
confirm no feature implementation occurred.
