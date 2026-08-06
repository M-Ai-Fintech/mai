# Finish — Wave F: Decisions, agent runtime, and access

**Model:** 5.6 Terra Medium\
**Run only after:** MAI-115, MAI-120, and MAI-124 PRs are owner-approved and
merged.

Read operating rules and Backlog finalization. Require clean synchronized master
and merged PR evidence. Inspect merged source and task records; verify immutable
decisions, durable recovery, authority/isolation, external access boundaries,
ACs, DoD, and meaningful tests.

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

Run focused security/recovery/integration checks and `deno task verify`. Do not
repair feature code here. If green, run exactly one `graphify update .` and
`git diff --check`.

Using Backlog CLI/MCP only, mark tasks Done only when every gate passes; do not
move them to completed. Remove only merged worktrees/branches. Commit
Backlog/Graphify changes as `docs: close delivery wave F`, push master, and
confirm no feature implementation occurred.
