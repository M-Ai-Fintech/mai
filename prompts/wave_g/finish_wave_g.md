# Finish — Wave G: Core business slices

**Model:** 5.6 Terra Medium  
**Run only after:** MAI-116, MAI-117, MAI-119, MAI-122, and MAI-125 PRs are owner-approved and merged.

Read operating rules and Backlog finalization. Require clean synchronized master and merged PR evidence. Inspect merged source and records; verify valuation authority, restricted matching, closing controls, release authorization, governance/legal holds, ACs, DoD, and meaningful tests.

Run focused finance/security/legal/recovery checks and `deno task verify`. Do not repair feature code. If green, run exactly one `graphify update .` and `git diff --check`.

Using Backlog CLI/MCP only, mark tasks Done only when every gate passes; do not move to completed. Remove only merged worktrees/branches. Commit Backlog/Graphify changes as `docs: close delivery wave G`, push master, and confirm no feature implementation occurred.
