# Finish — Wave L: Migration and retirement

**Model:** 5.6 Terra Medium. Run only after the MAI-129 PR is owner-approved and
merged.

Require clean synchronized master and merged PR evidence. Inspect merged source
and full task; verify exclusive migration ownership, rehearsed
import/reconciliation/cutover/rollback, no remaining prototype
writers/consumers, preserved history/manifests, ACs, DoD, and operator evidence.

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

Run focused migration/recovery checks and `deno task verify`. Do not repair
feature code. When green, run one `graphify update .` and `git diff --check`.

Use Backlog CLI/MCP to mark MAI-129 Done only when every gate passes. Do not
move to completed. Remove only merged worktree/branch. Commit Backlog/Graphify
changes as `docs: close delivery wave L`, push master, and confirm no feature
implementation occurred.
