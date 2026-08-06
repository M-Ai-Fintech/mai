# Finish — Wave M: Release gate

**Model:** 5.6 Terra Medium. Run only after the MAI-131 PR is owner-approved and
merged.

Require clean synchronized master and merged PR evidence. Inspect the merged
release dossier and final repository. Re-run or validate all critical workflow,
isolation, authority, concurrency, recovery, provider-failure, backup/restore,
and operational checks. Confirm zero open P0/P1 defects and no automatic
production promotion.

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

Run `deno task verify`. Do not repair feature code. When green, run exactly one
`graphify update .` and `git diff --check`.

Using Backlog CLI/MCP, mark MAI-131 Done only when every AC/DoD and release gate
is proven. Do not move it to completed. Remove only merged worktree/branch.
Commit Backlog/Graphify changes as `docs: close delivery wave M`, push master,
and return the production-candidate decision with evidence. Confirm no feature
implementation occurred.
