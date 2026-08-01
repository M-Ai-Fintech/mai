# Finish — Wave L: Migration and retirement

**Model:** 5.6 Terra Medium. Run only after the MAI-129 PR is owner-approved and merged.

Require clean synchronized master and merged PR evidence. Inspect merged source and full task; verify exclusive migration ownership, rehearsed import/reconciliation/cutover/rollback, no remaining prototype writers/consumers, preserved history/manifests, ACs, DoD, and operator evidence.

Run focused migration/recovery checks and `deno task verify`. Do not repair feature code. When green, run one `graphify update .` and `git diff --check`.

Use Backlog CLI/MCP to mark MAI-129 Done only when every gate passes. Do not move to completed. Remove only merged worktree/branch. Commit Backlog/Graphify changes as `docs: close delivery wave L`, push master, and confirm no feature implementation occurred.
