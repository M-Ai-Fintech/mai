Context

MAI-42 is a Wave G delivery task for **Closing control**. Linear issue MAI-42 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable local `AGENTS.md` execution plan, and the full Linear issue before changing code.

Use `$solve-mai` as the task workflow. Begin with the repair-or-restart assessment required by the operating policy. If no implementation exists yet, execute from the maestro-created task worktree and approved Linear plan; if a partial implementation or Draft PR exists, preserve it when repair is safer than restart.

Objective

Deliver closing conditions, checklist items, waivers, readiness, signature evidence, closing packages, and irreversible confirmation controls, consuming the MAI-21 dispute-resolution contract where applicable.

Relevant scope / architecture

The Closing bounded context owns condition/checklist lifecycle, waiver records, readiness decisions, signature evidence, closing-package state, blockers, and irreversible closing confirmations.

Use human-authorized commands for waivers, readiness approval, signatures, and irreversible completion. MAI-21 may inform dispute state but does not own closing authority.

If delegation is justified, safe slices are conditions/checklists, readiness/waivers, signature/package evidence, persistence/API, and irreversibility/concurrency tests.

Known risks or constraints

AI cannot waive conditions, sign, certify readiness, or confirm closing. Do not certify an e-signature provider without environment-specific provider evidence.

Irreversible transitions require exact authority, evidence, version checks, idempotency, audit, and rollback/compensation semantics where reversal is impossible.

Do not broaden into negotiation ownership, external provider certification, frontend redesign, or unrelated deal lifecycle work.

Expected verification

Run focused closing lifecycle, authority, waiver, readiness, signature-evidence, package, irreversibility, idempotency, audit, persistence, and API tests.

Before handoff, run affected PostgreSQL, rollback/transaction, changed-file type/lint/format checks, and `git diff --check`.

Run canonical `DENO_ENV=test deno task verify` once when ready and record exact evidence in Linear and the Draft PR. Do not include Graphify output in the implementation PR.

Allowed state transitions

Move Linear MAI-42 from Todo to In Progress only when implementation starts. Keep it In Progress through implementation and owner review. Create or update one Draft PR for MAI-42; do not self-approve, self-merge, mark the issue Done, perform wave closure, or change downstream issue state.

Only the authorized wave finisher may make the final Done transition after the merged-source and wave-level gates pass. Use Linear for task evidence and governed documentation.

/goal
