# Finish — Wave E: Work management

**Model:** 5.6 Terra Medium  
**Run only after:** the MAI-114 PR is owner-approved and merged into `master`.

Read `prompts/OPERATING_RULES.md` and Backlog finalization instructions. Require clean synchronized master and merged PR evidence. Inspect merged source and the complete task; verify plan conformance, state machines, approver authority, separation of duties, exact package versions, ACs, DoD, and meaningful tests.

Run focused checks and `deno task verify`. Do not repair feature code here. When green, run exactly one `graphify update .`, then `git diff --check`.

Using Backlog CLI/MCP only, check supported AC/DoD items and mark MAI-114 Done only when every gate passes. Do not move it to completed. Remove only merged local worktree/branch. Commit Backlog/Graphify changes as `docs: close delivery wave E`, push master, and confirm no feature implementation occurred.
