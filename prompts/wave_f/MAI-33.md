Context

MAI-33 is implemented in Draft PR #52 on the existing MAI-33 delivery
branch. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable
local `AGENTS.md` execution plan, the Linear issue MAI-33, and the current PR
diff before modifying code.

Begin with the required repair-or-restart assessment. The existing Deal Access
domain and persistence implementation is substantial; preserve it unless
repository evidence shows that repairing its trust boundaries is less safe
than a clean restart.

Objective

Correct Deal Access administrative authorization, authenticated identity
binding, invitation acceptance ownership, trusted portal-read composition,
and reliable session invalidation.

Remove unrelated generated Graphify churn from the PR and migrate this prompt
to the canonical task-prompt format defined by `prompts/OPERATING_RULES.md`.

Relevant scope / architecture

Primary scope is `src/deal_access/**`, `tests/deal_access/**`, and
`prompts/wave_f/MAI-33.md`. Use the existing platform authorization model for
administrative Deal Access actions.

An active human actor is not sufficient authority by itself. Bind command
actors to the authenticated request context and authorize invite, revoke, and
offboard operations against the exact tenant/workspace/deal resource before
protected mutation. Invitation acceptance must prove that the authenticated
external actor is the intended participant; a caller-supplied participant ID
and knowledge of a participation ID are not ownership evidence. Choose the
identity or capability mechanism that fits existing platform contracts and
test replay, expiry, wrong-actor, and already-consumed behavior.

Portal-read authorization must derive from trusted, scoped persisted
Participation and Grant state rather than arbitrary aggregates supplied by an
untrusted caller. Preserve deny-before-protected-object-load behavior,
protected-not-found semantics, and exact object/action/field/purpose
constraints. External DTOs and receipts remain allow-listed and must not leak
internal Findings, restricted evidence, negotiation strategy, internal
identifiers, or other non-approved information.

Revocation, offboarding, and expiry must durably record invalidation intent and
provide an explicit reliable completion and retry path. Reauthorize queued
work and invalidate active external sessions. Keep institution membership
separate from Deal Participation. Applied migrations are immutable; persisted
contract changes use additive migrations.

Forbidden shared paths and expansions are existing
`src/identity_access/**`, `src/deal_management/**`, `src/platform/**`,
`src/evidence_knowledge/**`, `src/work_management/**`, shared API/server
composition, frontend/Figma, internal decision or negotiation projections,
provider integration, and unrelated RLS work. Stop for requested RLS
activation, shared identity aggregate changes, external delivery/provider
credentials, or frontend contract changes without the required owner,
security, or frontend approval.

Known risks or constraints

Administrative mutation requires current scoped human authority, not a human
actor declaration. Authenticated actor and request-context IDs must match.
External grants remain strictly scoped by deal, participant, purpose, sponsor,
expiry, object, action, and fields. Denial must not reveal protected object
existence. Revocation/offboarding/expiry state and invalidation intent must be
durable and auditable even when post-commit invalidation delivery fails.

Keep one accountable owner, the existing MAI-33 branch/worktree, and one
coherent correction loop. Do not broaden the task into identity ownership,
institution membership, deal management, frontend/Figma, provider
integration, or RLS activation. Remove `graphify-out/graph.json` and
`graphify-out/GRAPH_REPORT.md` from the PR because Graphify output is
generated and non-authoritative for this functional task.

Expected verification

Run focused Deal Access security, lifecycle, portal, invitation, invalidation,
persistence, and migration tests during correction. Before handoff, verify
administrative authorization, actor/context binding, invitation ownership and
replay/expiry behavior, trusted Participation/Grant loading,
protected-not-found semantics, object-kind and field leakage controls,
revocation/offboarding/expiry invalidation, invalidation failure and retry,
PostgreSQL persistence, migration clean and historical upgrade behavior, and
transaction rollback.

Run changed-file type, lint, and format checks plus `git diff --check`. Run
`graphify update .` after code changes as required by the repository, then
ensure the generated Graphify files are absent from the final PR. Run the
canonical `DENO_ENV=test deno task verify` once when the correction is ready.
Record exact final evidence in the Draft PR and Linear issue, and request
human/security review only after correction and required verification are
complete.

Allowed state transitions

Keep MAI-33 In Progress and PR #52 Draft. Continue on the existing MAI-33
delivery branch. Do not merge, approve, close, mark MAI-33 Done, or perform
Wave closure.

/goal
