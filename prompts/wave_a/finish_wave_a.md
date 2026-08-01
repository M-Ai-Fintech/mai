# Finish — Wave A: Independent foundations

**Model:** 5.6 Terra Medium. Run only after all ten Wave A PRs are owner-approved and merged.

Require clean synchronized master and merged PR evidence. Inspect merged source and full records; verify identity security, registry PII boundaries, immutable audit, reproducible ONNX runtime, deterministic algorithms, canonical dispute contract, operations foundation, preflight behavior, ACs, DoD, and meaningful tests.

Run focused security/model/algorithm/operations checks and `deno task verify`. Do not repair feature code. When green, run exactly one `graphify update .` and `git diff --check`.

Use Backlog CLI/MCP to mark each task Done only when every gate passes. Do not move to completed. Remove only merged worktrees/branches. Commit Backlog/Graphify changes as `docs: close delivery wave A`, push master, and confirm no feature implementation occurred.
