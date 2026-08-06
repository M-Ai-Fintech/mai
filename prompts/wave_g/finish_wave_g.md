# Finish — Wave G: Core business slices

**Model:** 5.6 Terra Medium\
**Run only after:** MAI-116, MAI-117, MAI-119, MAI-122, and MAI-125 PRs are
owner-approved and merged.

Read operating rules and Backlog finalization. Require clean synchronized master
and merged PR evidence. Inspect merged source and records; verify valuation
authority, restricted matching, closing controls, release authorization,
governance/legal holds, ACs, DoD, and meaningful tests.

## Parallel review and verification

The finisher may use parallel read-only subagents for:

- architecture review;
- security and authorization review;
- data-model and migration review;
- concurrency and idempotency review;
- API-contract review;
- frontend conformance;
- focused verification;
- evidence reconciliation.

Every review or verification subagent must receive a concrete `/goal`.

Review subagents must not modify feature code, Backlog, Graphify, PR metadata,
or `master`.

Only the finisher may integrate wave-closure evidence, run Graphify, update
Backlog status, commit closure metadata, and push `master`.

Run focused finance/security/legal/recovery checks and `deno task verify`. Do
not repair feature code. If green, run exactly one `graphify update .` and
`git diff --check`.

Using Backlog CLI/MCP only, mark tasks Done only when every gate passes; do not
move to completed. Remove only merged worktrees/branches. Commit
Backlog/Graphify changes as `docs: close delivery wave G`, push master, and
confirm no feature implementation occurred.
