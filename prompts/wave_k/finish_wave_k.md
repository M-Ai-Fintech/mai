# Finish — Wave K: Final dependent side lanes

**Model:** 5.6 Terra Medium. Run only after MAI-150 and MAI-153 PRs are owner-approved and merged.

Require clean synchronized master and merged PR evidence. Inspect merged source and records; verify CLI replacement coverage, preserved operator tooling, evaluation methodology, data governance, formal Go/No-go, ACs, DoD, and tests.

Run focused checks and `deno task verify`. Do not repair feature code. When green, run one `graphify update .` and `git diff --check`.

Use Backlog CLI/MCP to mark tasks Done only when every gate passes. Do not move to completed. Remove only merged worktrees/branches. Commit Backlog/Graphify changes as `docs: close delivery wave K`, push master, and confirm no feature implementation occurred.
