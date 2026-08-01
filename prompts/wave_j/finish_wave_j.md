# Finish — Wave J: Cutover consumers and governance evidence

**Model:** 5.6 Terra Medium. Run only after all Wave J PRs are owner-approved and merged.

Require clean synchronized master and merged PR evidence. Inspect merged source and records; verify frontend parity, model lineage/authority, enterprise evidence integrity, feedback immutability/offline governance, ACs, DoD, and meaningful tests.

Run focused GUI/security/model/privacy checks and `deno task verify`. Do not repair feature code. When green, run one `graphify update .` and `git diff --check`.

Use Backlog CLI/MCP to mark tasks Done only when every gate passes. Do not move to completed. Remove only merged worktrees/branches. Commit Backlog/Graphify changes as `docs: close delivery wave J`, push master, and confirm no feature implementation occurred.
