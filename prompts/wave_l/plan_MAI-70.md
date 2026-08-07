Context

This is the planning-only handoff for Linear MAI-70 — Data migration and MVP retirement. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the full Linear issue/history, migration ADRs, all replacement-task evidence, current migrations/stores/routes/schemas/fixtures/adapters, retirement inventories, tests, and consumers.

Objective

Produce the exclusive cutover plan covering legacy writers/readers, target mappings, import/dual-read/reconciliation, idempotency, manifests, thresholds, feature flags, consumer migration, staged cutover, rollback windows, evidence preservation, physical retirement order, failure recovery, and operator runbooks.

Relevant scope / architecture

MAI-70 is the sole migration/cutover owner. Define exact exclusive files, immutable applied migrations, clean and historical paths, reconciliation thresholds, destructive sequencing, rollback points, retention/legal-hold constraints, and final consumer proof.

Delegation may cover read-only inventory, mappings, test design, or disjoint non-destructive transformations when materially faster; the plan must provide one concrete worker `/goal`, exclusive paths, forbidden migration/shared files, checks, and serial integration order. Destructive/migration ordering stays coordinator-owned.

Known risks or constraints

Do not implement, commit, push, open a PR, change MAI-70 state, run Graphify, mutate applied migration bytes, delete historical evidence, or allow another task/worker to own cutover files.

Expected verification

Validate the plan against Linear dependencies and consumer cutover state, migration-ledger integrity, reconciliation/rollback feasibility, operator prerequisites, exclusive ownership, and executable clean/historical/recovery tests. Write `## Wave L execution plan — MAI-70` to local `AGENTS.md` and persist it in Linear.

Allowed state transitions

Planning only. Keep MAI-70 Todo and MAI-71 blocked.

/goal
