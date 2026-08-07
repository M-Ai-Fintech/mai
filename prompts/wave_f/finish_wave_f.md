# Finish — Wave F: Decisions, agent runtime, and access

**Run only after:** MAI-115, MAI-120, and MAI-124 PRs are owner-approved and
merged.

Read `prompts/OPERATING_RULES.md` and Backlog finalization. Require clean synchronized master
and merged PR evidence. Inspect merged source and task records; verify immutable
decisions, durable recovery, authority/isolation, external access boundaries,
ACs, DoD, and meaningful tests.

## Execution policy

Use one accountable finisher. Parallel read-only review is exceptional and must be genuinely separable and materially faster; use `prompts/SUBAGENT_RULES.md` only when justified.

Run focused security/recovery/integration checks and `deno task verify`. Do not
repair feature code here. If green, run exactly one `graphify update .` and
`git diff --check`.

Using Backlog CLI/MCP only, mark tasks Done only when every gate passes; do not
move them to completed. Remove only merged worktrees/branches. Commit
Backlog/Graphify changes as `docs: close delivery wave F`, push master, and
confirm no feature implementation occurred.
