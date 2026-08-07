Context

Wave F contains Linear issues MAI-31, MAI-32, and MAI-33. Their implementation PRs are merged; Linear and merged GitHub evidence are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, all three full Linear issues, merged source, and current master before closure.

Objective

Close Wave F only if merged-source evidence proves Diligence & Decisions authority, Agent Runtime durability/recovery, and Deal Access isolation/external-participant controls satisfy their issue acceptance criteria and wave-level integration gates.

Relevant scope / architecture

Review merged code and exact issue/PR evidence for immutable decisions and current references, runtime authorization/scope/lease fencing and recovery, Deal Access participation/grants/invitation/session invalidation, shared authorization boundaries, migrations, and meaningful PostgreSQL/integration coverage.

Read-only parallel verification is permitted only when genuinely separable and materially faster under `SUBAGENT_RULES.md`; each reviewer receives a concrete `/goal`. Only the finisher writes Linear closure evidence, Graphify, and master closure metadata.

Known risks or constraints

Do not repair feature code, reinterpret a failed/ignored/timeout gate as pass, or close an issue whose merged implementation is incomplete. Do not create feature commits from the finisher.

Expected verification

Run focused security/recovery/integration checks for all three merged tasks and canonical `DENO_ENV=test deno task verify`. Reconcile acceptance criteria, merged PR heads, migration integrity, zero unresolved task P0/P1 blockers, and exact Linear evidence.

Only when green, run exactly one `graphify update .`, then `git diff --check`, update Linear MAI-31/32/33 to Done as applicable, remove only merged worktrees/branches, commit closure metadata as `docs: close delivery wave F`, push master, and verify clean synchronized master.

If any required gate fails, record the exact blocker in Linear, leave affected issues non-Done, do not run Graphify for closure, and do not make the closure commit.

Allowed state transitions

The finisher may transition MAI-31, MAI-32, and MAI-33 to Done only after all issue and Wave F gates pass. It may push the authorized Wave F closure commit to master. It may not implement feature fixes or start Wave G tasks.

/goal
