Context

Wave L contains Linear issue MAI-70 — Data migration and MVP retirement. Run only after its owner-approved PR is merged. Linear state, migration manifests, reconciliation/rollback evidence, operator records, and merged source are authoritative.

Objective

Close Wave L only after proving exclusive migration ownership, clean and historical upgrade paths, import/reconciliation/cutover/rollback, complete consumer cutover, safe retirement, preserved history/manifests, and operator readiness on merged master.

Relevant scope / architecture

Review the entire MAI-70 migration/cutover result and all declared replacement dependencies. Read-only migration/recovery reviewers may run in parallel only when justified and each receives a concrete `/goal`; only the finisher writes closure state and Graphify.

Known risks or constraints

Do not repair feature/migration code, rewrite applied migrations, accept unexplained reconciliation mismatches, delete historical evidence, or close while legacy writers/consumers remain authoritative without explicit approved retention.

Expected verification

Run focused migration/reconciliation/cutover/rollback/recovery checks and canonical `DENO_ENV=test deno task verify`. Confirm manifests, reconciliation thresholds, rollback proof, migration-ledger integrity, operator evidence, consumer inventory, and zero unresolved P0/P1 blockers.

If green, run one `graphify update .`, `git diff --check`, mark MAI-70 Done in Linear, remove only the merged branch/worktree, commit `docs: close delivery wave L`, push master, and verify clean synchronized master. Otherwise record the exact blocker and leave MAI-70 non-Done.

Allowed state transitions

The finisher may mark MAI-70 Done and push the Wave L closure commit only after all migration gates pass. It may not implement repairs or start MAI-71 before closure is complete.

/goal
