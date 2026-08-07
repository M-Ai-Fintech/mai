Context

MAI-70 is the Wave L task for **Data migration and MVP retirement** and is the exclusive migration/cutover owner. Linear issue MAI-70 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, `plan_MAI-70.md`, all applicable local `AGENTS.md` instructions, migration/retirement evidence, replacement-task state, and the full Linear issue before changing code.

Use `$solve-mai` as the task workflow. Begin with the repair-or-restart assessment. Use the maestro-created worktree and approved Linear cutover plan. Do not execute destructive work until every declared dependency and consumer gate is proven.

Objective

Execute the exclusive migration, dual-read/reconciliation, consumer-cutover, rollback, and retirement program; retire legacy/MVP writers, registrations, schemas, tools, and compatibility paths only after replacement coverage and cutover evidence are complete.

Relevant scope / architecture

MAI-70 exclusively owns migration ordering, cutover flags, compatibility readers/writers, reconciliation tooling, retirement manifests, rollback windows, and physical deletion of obsolete compatibility paths.

Safe subagent work may include inventory, mapping analysis, read-only reconciliation, test preparation, and isolated non-overlapping transformation slices. Migration ordering, destructive operations, cutover decisions, shared migration files, and final reconciliation remain coordinator-owned and serial.

Known risks or constraints

Do not rewrite applied migrations, delete historical evidence, distort target domains with compatibility shims, or allow concurrent ownership of migration/cutover files.

No physical retirement occurs until consumers, reconciliation, rollback, retention, legal-hold, and operator evidence pass. Unknown mismatches block cutover.

Expected verification

Verify clean bootstrap and historical upgrade paths, migration ledger immutability, transformation idempotency, dual-read/reconciliation, consumer cutover, rollback, retained history, manifests, disabled legacy writers/readers, and recovery after failure.

Run rehearsals on approved isolated environments, exact reconciliation thresholds, changed-file type/lint/format checks, `git diff --check`, and canonical `DENO_ENV=test deno task verify` once the cutover candidate is ready. Record exact manifests, mismatches, rollback windows, and operator evidence in Linear and the Draft PR.

Allowed state transitions

Move Linear MAI-70 from Todo to In Progress only when implementation starts. Keep it In Progress and its PR Draft through owner/migration/security review. Do not self-approve, self-merge, mark Done, perform Wave L closure, or start MAI-71 before the authorized finisher closes Wave L.

Only the authorized Wave L finisher may make the final Done transition after merged-source migration verification.

/goal
