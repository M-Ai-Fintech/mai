# Finish — Wave I: Governed agents and providers

Read `prompts/OPERATING_RULES.md` and Backlog finalization instructions.

**Run only after:** MAI-121 and MAI-127 PRs are owner-approved and merged.

Require clean synchronized master and merged PR evidence. Inspect merged source
and full records; verify agent versioning, ToolGateway authority, prohibited
effects, no self-learning/fake inference, provider capability/health/failure
evidence, no silent fixtures, ACs, DoD, and meaningful tests.

## Execution policy

Use one accountable finisher. Parallel read-only review is exceptional and must be genuinely separable and materially faster; use `prompts/SUBAGENT_RULES.md` only when justified.

Run focused security/provider/integration checks and `deno task verify`. Do not
repair feature code. When green, run one `graphify update .` and
`git diff --check`.

Use Backlog CLI/MCP to mark tasks Done only when every gate passes. Do not move
to completed. Remove only merged worktrees/branches. Commit Backlog/Graphify
changes as `docs: close delivery wave I`, push master, and confirm no feature
implementation occurred.
