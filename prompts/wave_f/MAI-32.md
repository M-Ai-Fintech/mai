Context

MAI-32 is implemented in Draft PR #53 on the existing MAI-32 delivery branch.
Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, `plan_MAI-32.md`, the
applicable local `AGENTS.md`, the Linear issue MAI-32, and the current PR diff
before changing code.

Begin with a repair-or-restart assessment. The durable runtime model and its
verification evidence are substantial, so preserve them unless repository
evidence shows that repairing the trust boundaries is less safe than rebuilding
them. The current implementation provides durable Missions, Plans, Runs,
Steps, Tool Activities, Results, Artifacts, immutable attempts,
recovery/retry, source-version invalidation, authorization at execution
boundaries, cost metadata, PostgreSQL persistence, and audit/event behavior.
The correction is bounded to the Agent Runtime authentication, authorization,
scope-isolation, protected-read, and lease-fencing defects.

Objective

Close the Agent Runtime authentication binding, authorization, tenant/deal
isolation, protected-read, and lease-fencing defects while preserving durable
Missions, versioned Plans, Runs, Steps, Tool Activities, Results, Artifacts,
immutable attempts, lineage, retries, cancellation, and recovery semantics.

Bind caller-supplied runtime actors to the authenticated
`RequestContext.actorId` wherever actor identity participates in
authorization, audit, idempotency, or runtime ownership. Use the existing
platform authorization contracts. Enforce exact tenant/workspace/deal scope
for Mission, Plan, Run, cancellation, and protected-read operations. A Run may
only be queued from an active Plan in the same exact scope.

Make protected reads for Missions, Plans, Runs, Steps, Tool Activities,
Results, Artifacts, and Attempts scope-aware and protected-not-found on denied
or absent resources. A worker that loses ownership must be fenced at the
actual tool or executor effect boundary and must not create a durable or
externally observable success effect. Preserve the prohibition against
unrestricted tools and irreversible direct side effects.

Also migrate this prompt to this canonical format and terminate it with
`/goal`.

Relevant scope / architecture

Primary scope:

* `src/agent_runtime/**`
* `tests/agent_runtime/**`
* `prompts/wave_f/MAI-32.md`

The Agent Runtime bounded context owns Mission, versioned Plan, Run, Step,
Tool Activity, Result, Artifact, attempt, lineage, cost, recovery, retry,
cancellation, source-version invalidation, audit, and outbox behavior.
Model/provider and specialist definitions remain adapters and knowledge
assets, not runtime authority. The runtime accepts trusted actor and scope,
uses context-owned ToolGateway application services, and permits proposals or
reversible drafts only. It cannot approve, communicate externally,
grant/revoke, invite/offboard, release, or perform an equivalent direct side
effect.

Review PostgreSQL read paths and writes for exact persisted scope. Use additive
migrations only if persisted contracts must change; applied migrations are
immutable. Reauthorize immediately before each tool or executor effect and
make competing and expired lease behavior testable. Preserve failed attempts,
append-only evidence, rollback by stopping the new runner, and replay/recovery
semantics.

Do not modify existing specialist definitions, shared platform, identity and
access, evidence/knowledge, work management, shared API/server composition,
provider credentials, GUI/Figma, unrestricted tool wiring, or direct
side-effect adapters. Stop and report if the correction requires one of those
shared-path changes.

Known risks or constraints

Do not treat caller-declared actor kind or active state as authorization by
itself. Do not rely on globally unique identifiers for tenant/deal isolation.
Authorization must be evaluated at the protected action or effect boundary.
Do not weaken shared platform authorization semantics to accommodate Agent
Runtime.

Preserve durable recovery, immutable attempts, complete prompt/model/tool/
evidence lineage, cost metadata, cancellation, retry, stale-source
invalidation, and the prohibition against unrestricted tools and irreversible
direct side effects. Do not broaden the task into specialist-agent
definitions, provider credentials, GUI/Figma, unrelated platform work, or
Wave closure.

Keep one accountable owner on the existing MAI-32 delivery branch. Keep MAI-32
In Progress and PR #53 Draft. Do not merge, approve, close, mark MAI-32 Done,
or perform Wave closure. Request human/security review only after correction
and required verification are complete.

Expected verification

During correction, run focused Agent Runtime unit, authorization, persistence,
protected-read, and runner tests. Add adversarial regression coverage for
actor/context mismatch, cross-scope identifiers, Plan-to-Run scope mismatch,
unauthorized reads and cancellation, competing or expired worker leases, and
absence of durable or external success effects after rejected authorization or
lost ownership.

Before handoff, verify the complete affected Agent Runtime category, including
actor/context binding, authorization denial, tenant/workspace/deal isolation,
protected reads, cross-scope Plan/Run behavior, cancellation authorization,
lease-loss and competing-worker behavior, PostgreSQL persistence and migration
integrity, and retained immutable attempts. Run changed-file type, lint, and
format checks plus `git diff --check`.

Run the canonical verifier exactly once when the correction is ready for final
verification:

`DENO_ENV=test deno task verify`

Record exact final evidence in PR #53 and the Linear issue MAI-32. Keep the
issue In Progress and the PR Draft while handing off for human/security review.

Allowed state transitions

Keep MAI-32 In Progress.

Keep PR #53 Draft.

Continue on the existing MAI-32 delivery branch.

Do not merge, approve, close, mark MAI-32 Done, or perform Wave closure.

Request human/security review only after the correction and required
verification are complete.

/goal
