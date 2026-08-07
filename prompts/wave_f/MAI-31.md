Context

MAI-31 is the Wave F Diligence & Decisions bounded context. The existing
implementation is on Draft PR #54 and the existing branch
`delivery/MAI-31-findings-impacts-and-decisions`; preserve it as the repair
basis. It provides version-bound Finding and Impact proposals, Decision
Requests, immutable human Decision Records, current-decision projections,
exact Evidence Knowledge basis verification, Work Management authority
resolution, PostgreSQL persistence, transactional audit/outbox effects, and
scoped idempotency.

Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable local
`AGENTS.md`, the Linear issue MAI-31, and the current PR diff before editing.
Begin with the repair-or-restart assessment required by
`prompts/OPERATING_RULES.md`. Keep the task In Progress and the PR Draft.

Objective

Correct the remaining human-authority and current-decision consistency defects
in MAI-31. An approved Finding or Impact must not be removed or replaced
without the required active human authority. Add regression coverage for
approved Finding and Impact supersession, including denial and the authorized
human path.

Define one explicit domain contract for
`DecisionRequest.decisionRecordId` and
`DecisionProjection.currentRecordId`. Supersession must advance both references
transactionally so externally observable state cannot expose contradictory
current-decision definitions. Preserve immutable Decision Records and
append-only history. Add or refine stale-version and competing-supersession
PostgreSQL coverage where required.

Migrate this prompt to the canonical task-prompt format and terminate it with
`/goal`.

Relevant scope / architecture

Primary paths are `src/diligence_decisions/**`,
`tests/diligence_decisions/**`, and `prompts/wave_f/MAI-31.md`. Continue using
Evidence Knowledge only through its public versioned contracts, human actor
authority from Work Management, and platform authorization, persistence, and
event ports. Keep command state, projections, history, audit/outbox effects,
and idempotency transactional where they form one operation.

The current-decision contract is: `DecisionRequest.decisionRecordId` and
`DecisionProjection.currentRecordId` identify the same current immutable
Decision Record whenever a decision exists; supersession changes both
references, while invalidation preserves the referenced historical record and
changes only lifecycle/projection state. A Decision Record itself is never
rewritten.

Do not modify Evidence Knowledge, Work Management, platform, shared API/server
composition, GUI/Figma, valuation, matching, negotiation, or closing code.
Do not add legacy decision imports, production-provider certification, or
unrelated cleanup.

Known risks or constraints

Exact Evidence Knowledge versions and decision provenance must remain
preserved. Authorization and actor/context binding must not be weakened, and
human authority over approved material conclusions must remain explicit.

Applied migrations are immutable. Do not reformat or rewrite an applied
migration; use an additive migration for any persisted-contract schema change.
The current correction should avoid schema change unless database evidence
proves one is required.

Preserve transactionality across domain state, current references, projections,
history, audit/outbox effects, and idempotency. A skipped required PostgreSQL
test, unavailable prerequisite, partial run, or timeout is not a pass.

Expected verification

Run focused Diligence tests and directly affected PostgreSQL tests during the
correction. Before handoff, complete the affected Diligence category,
including:

- Finding/Impact lifecycle authority;
- Decision supersession and current-reference semantics;
- stale-version and competing-supersession behavior;
- PostgreSQL persistence and transaction rollback where database behavior is
  affected;
- migration integrity;
- changed-file type, lint, and format checks;
- `git diff --check`.

Run canonical `DENO_ENV=test deno task verify` once when the correction is
ready for final verification. Record exact terminal evidence, including any
environment blocker, in the Draft PR and Linear issue.

Allowed state transitions

Keep MAI-31 In Progress. Keep PR #54 Draft. Continue on the existing MAI-31
delivery branch. Do not merge, approve, close the issue, mark MAI-31 Done, or
perform Wave closure. Request human review only after correction and required
verification are complete.

/goal
