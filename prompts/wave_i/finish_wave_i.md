# Finish — Wave I: Governed agents and providers

**Model:** 5.6 Terra Medium\
**Run only after:** MAI-121 and MAI-127 PRs are owner-approved and merged.

Require clean synchronized master and merged PR evidence. Inspect merged source
and full records; verify agent versioning, ToolGateway authority, prohibited
effects, no self-learning/fake inference, provider capability/health/failure
evidence, no silent fixtures, ACs, DoD, and meaningful tests.

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

Run focused security/provider/integration checks and `deno task verify`. Do not
repair feature code. When green, run one `graphify update .` and
`git diff --check`.

Use Backlog CLI/MCP to mark tasks Done only when every gate passes. Do not move
to completed. Remove only merged worktrees/branches. Commit Backlog/Graphify
changes as `docs: close delivery wave I`, push master, and confirm no feature
implementation occurred.
