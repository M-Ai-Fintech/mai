Context

MAI-41 is a Wave G delivery task for **Matching, conflicts and shortlist**. Linear issue MAI-41 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable local `AGENTS.md` execution plan, and the full Linear issue before changing code.

Use `$solve-mai` as the task workflow. Begin with the repair-or-restart assessment required by the operating policy. If no implementation exists yet, execute from the maestro-created task worktree and approved Linear plan; if a partial implementation or Draft PR exists, preserve it when repair is safer than restart.

Objective

Deliver matching criteria, runs and candidates, conflicts and restricted identities, recommendation/shortlist state, and outreach-authorization boundaries using the deterministic matching contracts from MAI-19.

Relevant scope / architecture

The Matching & Conflicts bounded context owns matching criteria/runs, candidate projections, conflict/restriction state, shortlist decisions, and the authorization boundary for later outreach.

Consume MAI-19 as a pure optimization/scoring dependency; compliance, KYC, authority, restrictions, and human shortlist decisions remain outside the optimizer.

If delegation is justified, safe slices are matching lifecycle, conflict/restriction policy integration, shortlist/authorization state, persistence/API, and isolation/security tests.

Known risks or constraints

Do not send outreach, reveal restricted candidates, infer permission from rank/score, or encode compliance/KYC policy inside the optimizer.

Protected candidates and conflicts must remain tenant/workspace/deal scoped with protected-not-found behavior where required. Do not broaden into negotiation, external communications, provider certification, or MAI-19 ownership.

Applied migrations are immutable; persisted changes use additive migrations.

Expected verification

Run focused matching, conflict, restriction, shortlist, authorization, deterministic-algorithm, scope-isolation, persistence, and API tests.

Before handoff, run affected PostgreSQL and concurrency/idempotency tests plus changed-file type/lint/format checks and `git diff --check`.

Run canonical `DENO_ENV=test deno task verify` once when ready and record exact evidence in Linear and the Draft PR. Do not include Graphify output in the implementation PR.

Allowed state transitions

Move Linear MAI-41 from Todo to In Progress only when implementation starts. Keep it In Progress through implementation and owner review. Create or update one Draft PR for MAI-41; do not self-approve, self-merge, mark the issue Done, perform wave closure, or change downstream issue state.

Only the authorized wave finisher may make the final Done transition after the merged-source and wave-level gates pass. Use Linear for task evidence and governed documentation.

/goal
