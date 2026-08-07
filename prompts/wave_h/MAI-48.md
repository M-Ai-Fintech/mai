Context

MAI-48 is a Wave H delivery task for **Negotiation**. Linear issue MAI-48 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable local `AGENTS.md` execution plan, and the full Linear issue before changing code.

Use `$solve-mai` as the task workflow. Begin with the repair-or-restart assessment required by the operating policy. If no implementation exists yet, execute from the maestro-created task worktree and approved Linear plan; if a partial implementation or Draft PR exists, preserve it when repair is safer than restart.

Objective

Deliver negotiation rounds, proposals and counterproposals, normalized terms, internal positions/BATNA, mandate comparison, approvals, and a separate authorized delivery job using MAI-20 negotiation optimization and MAI-21 dispute-resolution contracts.

Relevant scope / architecture

The Negotiation bounded context owns rounds, proposal versions, normalized terms, internal position, mandate comparison, approval state, and authorized delivery requests/receipts.

Optimization and dispute contracts provide deterministic analysis only. Human authority owns approval, acceptance, release, and external communication.

If delegation is justified, safe slices are proposals, counterproposals, term comparison, alternatives/optimization integration, approval authority, persistence/API, and concurrency/audit tests.

Known risks or constraints

Agents and optimizers cannot approve, accept, send, release, or finalize terms. Internal strategy must never leak through external DTOs or delivery payloads.

Proposal versioning, mandate constraints, recipient scope, approval basis, delivery idempotency, and audit must remain exact and transactionally coherent.

Do not broaden into matching ownership, closing authority, provider certification, or frontend redesign.

Expected verification

Run focused negotiation lifecycle, proposal/counterproposal, normalized-term, mandate/BATNA, approval, internal/external DTO separation, delivery authorization/idempotency, optimization/dispute integration, persistence, and API tests.

Before handoff, run affected PostgreSQL/security/concurrency/rollback checks plus changed-file type/lint/format and `git diff --check`.

Run canonical `DENO_ENV=test deno task verify` once when ready and record exact evidence and rollback behavior in Linear and the Draft PR. Do not include Graphify output in the implementation PR.

Allowed state transitions

Move Linear MAI-48 from Todo to In Progress only when implementation starts. Keep it In Progress through implementation and owner review. Create or update one Draft PR for MAI-48; do not self-approve, self-merge, mark the issue Done, perform wave closure, or change downstream issue state.

Only the authorized wave finisher may make the final Done transition after the merged-source and wave-level gates pass. Use Linear for task evidence and governed documentation.

/goal
