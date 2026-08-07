# Finish — Wave G: Core business slices

**Run only after:** MAI-116, MAI-117, MAI-119, MAI-122, and MAI-125 PRs are
owner-approved and merged.

Read `prompts/OPERATING_RULES.md` and Backlog finalization. Require clean synchronized master
and merged PR evidence. Inspect merged source and records; verify valuation
authority, restricted matching, closing controls, release authorization,
governance/legal holds, ACs, DoD, and meaningful tests.

## Execution policy

Use one accountable finisher. Parallel read-only review is exceptional and must be genuinely separable and materially faster; use `prompts/SUBAGENT_RULES.md` only when justified.

Run focused finance/security/legal/recovery checks and `deno task verify`. Do
not repair feature code. If green, run exactly one `graphify update .` and
`git diff --check`.

Using Backlog CLI/MCP only, mark tasks Done only when every gate passes; do not
move to completed. Remove only merged worktrees/branches. Commit
Backlog/Graphify changes as `docs: close delivery wave G`, push master, and
confirm no feature implementation occurred.
