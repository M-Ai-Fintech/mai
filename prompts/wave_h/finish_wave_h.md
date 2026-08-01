# Finish — Wave H: Negotiation

**Model:** 5.6 Terra Medium  
**Run only after:** the MAI-118 PR is owner-approved and merged.

Require clean synchronized master and merged PR evidence. Inspect merged source and the full task; verify internal/external DTO separation, mandate comparison, human approval, delivery authorization/idempotency, MAI-146/147 integration, ACs, DoD, and tests.

Run focused checks and `deno task verify`. Do not repair feature code. When green, run one `graphify update .` and `git diff --check`.

Use Backlog CLI/MCP to mark MAI-118 Done only when every gate passes. Do not move to completed. Remove only merged worktree/branch. Commit Backlog/Graphify changes as `docs: close delivery wave H`, push master, and confirm no feature implementation occurred.
