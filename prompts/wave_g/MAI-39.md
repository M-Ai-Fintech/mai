Context

MAI-39 is a Wave G delivery task for **Valuation scenarios and approval**. Linear issue MAI-39 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable local `AGENTS.md` execution plan, and the full Linear issue before changing code.

Use `$solve-mai` as the task workflow. Begin with the repair-or-restart assessment required by the operating policy. If no implementation exists yet, execute from the maestro-created task worktree and approved Linear plan; if a partial implementation or Draft PR exists, preserve it when repair is safer than restart.

Objective

Deliver versioned valuation models, scenarios, inputs, results, compute jobs/ports, comparisons, approval, and invalidation using the deterministic valuation and synergy contracts from MAI-18.

Relevant scope / architecture

The Valuation bounded context owns valuation model/scenario lifecycle, input and result versions, deterministic compute requests/results, comparison projections, approval state, and stale/invalidation behavior.

Consume MAI-18 only through its deterministic calculation contracts. Keep financial units, rounding, scenario version, exact input basis, provenance, and human approval explicit.

If delegation is justified by the operating policy, safe slices are domain/state transitions, deterministic-compute integration, persistence/API, and focused valuation/concurrency tests; shared composition and task-wide integration stay coordinator-owned.

Known risks or constraints

AI or model output cannot establish transaction price or approve a valuation. A computed result remains analysis until an authorized human transition.

Do not hide units, rounding, stale inputs, model/version lineage, or basis changes. Do not broaden into matching, negotiation, frontend redesign, provider certification, or MAI-18 algorithm ownership.

Applied migrations are immutable; persisted-contract changes use additive migrations.

Expected verification

Run focused valuation domain, deterministic-calculation, approval, stale/invalidation, concurrency/idempotency, persistence, and API tests during implementation.

Before handoff, run directly affected PostgreSQL tests, changed-file type/lint/format checks, `git diff --check`, and the relevant complete valuation category.

Run canonical `DENO_ENV=test deno task verify` once when the task is ready. Record exact results, ignored required tests, and blockers in Linear and the Draft PR. Do not include Graphify output in the implementation PR.

Allowed state transitions

Move Linear MAI-39 from Todo to In Progress only when implementation starts. Keep it In Progress through implementation and owner review. Create or update one Draft PR for MAI-39; do not self-approve, self-merge, mark the issue Done, perform wave closure, or change downstream issue state.

Only the authorized wave finisher may make the final Done transition after the merged-source and wave-level gates pass. Use Linear for task evidence and governed documentation.

/goal
