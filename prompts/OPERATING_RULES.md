# MA&I Execution and Verification Operating Policy

This file is the single stable operating-policy authority for prompts under
`prompts/`. Task prompts describe the task. They do not copy this policy.

## Execution route

The runtime-selected model is authoritative. Do not block, downgrade, or
substitute because an agent internally identifies itself differently. Treat a
model as unavailable only when the execution surface reports it unavailable.

Route by the work being done:

| Work shape | Default route |
| --- | --- |
| Substantial MA&I implementation, debugging, diagnosis, or interactive correction | **5.6 Luna Max** |
| Small, mechanical, easy, or clearly diagnosed correction | **5.6 Luna Medium** |
| Coordination, planning handoff, evidence reconciliation, or closure without implementation | **5.6 Terra Medium** |
| Genuinely deep architecture, security, or planning ambiguity | **Sol**, only with an explicit written justification |

The route is a fit decision, not an automatic escalation ladder. Do not use a
high-reasoning model for mechanical work. Do not substitute a different model
automatically when a selected route is unavailable; report the runtime result
and let the owner choose the next route.

## Fast mode

Fast mode is ON by default for implementation, debugging, diagnosis, and
interactive correction. Fast mode changes execution latency only. It does not
change scope, ownership, required tests, migration safety, model identity,
Linear issue state, or completion gates. Fast mode is controlled by the execution
surface; this repository documents the expectation and does not invent a
product-internal switch.

## Accountable agent and delegation

Use one accountable primary agent and one coherent implementation loop by
default. Do not create specialist agents, review swarms, or duplicate review
passes automatically.

Multi-agent execution is justified only when the work is genuinely separable,
ownership is disjoint, the handoff and integration cost are lower than the
serial path, and the expected elapsed-time reduction is material. A coordinator
must record the reason, exclusive paths, forbidden shared paths, integration
order, and focused checks before delegation. All writers use isolated worktrees
or patch-only handoffs and are integrated serially. Independent review swarms
are out of scope by default. When delegation is justified, read
`SUBAGENT_RULES.md`; otherwise do not spawn subagents.

## Time, checkpoints, and usage

For substantial implementation, target roughly 15–20 minutes of productive
execution. Assess progress around 15 minutes. At roughly 30 minutes, make a
hard judgment checkpoint rather than treating time as a kill timer. At that
boundary, complete bounded work that is nearly finished, simplify, report a
real blocker, choose restart, or return a precise handoff. Do not wander for
hours looking for hypothetical defects.

Conserve usage through engineering judgment:

- Do not reread unchanged areas repeatedly.
- Do not run an expensive suite without a meaningful state change or evidence
  that its failed category is the one being corrected.
- Do not run duplicate whole-repository reviews by default.
- Prefer one accountable implementation loop over automatic specialists.
- Keep targeted evidence and reuse warmed dependencies.
- Do not impose rigid per-command quotas where a bounded engineering decision
  is clearer.

## Repair or restart

Every correction or recovery prompt begins with this assessment:

> Is the existing implementation cheaper and safer to repair, or is a revert
> or clean restart safer?

Use engineering judgment over arbitrary thresholds. Consider scope drift,
corrective layers, architectural divergence, migration-history integrity,
shared-platform contamination, diff complexity, number and coupling of
failures, confidence in the existing implementation, and repair cost versus
reimplementation cost. For merged work, choose localized correction versus
revert and clean reimplementation using the same assessment. Record the choice
and its evidence in the task record.

## Implementation and verification loop

During implementation, run only the smallest useful proof:

1. affected unit or contract tests;
2. affected type checks;
3. targeted format and lint checks;
4. directly affected integration or PostgreSQL tests.

Near completion, run the relevant complete category and the complete
PostgreSQL category when database behavior changed. The canonical verifier is a
final/completion gate, not the normal inner loop. Run it once after the state is
ready.

If canonical verification fails, diagnose the failed category, work only on
that category while correcting, rerun that category, and run canonical once
again after the category is green. A timeout, ignored required test, missing
prerequisite, unavailable check, or partial run is not a pass.

Non-database tests may remain parallel. PostgreSQL and database-marked tests
remain serialized where they share database behavior. The canonical runner
must show the category, command, terminal result, ignored required tests, and
machine-readable summary when technically possible.

## Environment preflight and prewarming

Use idempotent `prepare`/`preflight` operations before active implementation:

- keep Docker running and verify the approved PostgreSQL service is healthy;
- verify the approved isolated integration database and reject development,
  staging, or production targets;
- warm Deno cache and Node/GUI dependencies only when missing;
- verify browser/test dependencies when GUI checks are in scope;
- check Git remote/auth/write capability only for tasks authorized to push;
- leave an extensible hook for future Papermark/provider dependencies.

Do not destroy and recreate a healthy container or reinstall healthy
dependencies. Fail early when a required prerequisite is genuinely absent.
The approved test target is routine within an authorized implementation task;
production database/deployment access, force push, unrelated repositories, and
destructive remote actions are never implied.

## Database and migration integrity

The preferred PostgreSQL lifecycle is:

```text
persistent pre-warmed server
  → clean reusable isolated test state
  → tests
  → cheap cleanup or reuse
```

Use semantic test resource names and explicit environment variables. Never
derive runtime resources, schemas, queues, fixtures, or environment variables
from legacy Backlog identifiers or current Linear issue IDs. Keep database-marked tests isolated and serialized when
shared state requires it.

Verify both migration paths:

```text
clean path:       empty database → complete migrations → current schema
historical path:  known schema/ledger → current source → expected upgrade
```

Applied migration definitions are immutable byte-for-byte. Never reformat an
applied migration to satisfy a style rule. Pin historical checksums in focused
regression tests where useful. Future behavior changes use additive migrations.

## Writing and structure

Prefer focused modules, cohesive small functions, explicit public return
types, clear names, useful API documentation, and manageable files. These are
semantic goals, not permission to damage correct artifacts mechanically.

Semantic integrity overrides mechanical size or formatting expectations for
immutable/checksum-bound migrations, large SQL definitions, generated
artifacts, schemas, fixtures, snapshots, protocol definitions, and large
declarative mappings. For new large SQL, prefer meaningful database-native
decomposition—functions, procedures, views, materialized views, triggers, or
reusable database functions—when it improves the design. Do not split SQL into
arbitrary TypeScript fragments just to satisfy a line count.

Deterministic checks should target high-signal violations: changed-file
structural drift, task-ID-derived runtime resources, forbidden bounded-context
dependencies, migration checksum mutation, and silently ignored required
database tests. Checks must support the semantic exceptions above and avoid
brittle broad parsers.

## Git, Linear, and lifecycle authority

Routine operations inside an already-authorized task include repository-local
edits, status/diff, normal fetch, approved test PostgreSQL access, Docker
commands for the approved test environment, and commit/push when explicitly
authorized. They do not authorize production access, deployment, force push,
unrelated repositories, or destructive remote actions.

Linear is the system of record for active and completed project work and
governed project documentation. Use the Linear MAI team, issue/document tools,
projects, and native relations for current task state, acceptance criteria,
dependencies, evidence, project/wave context, and documentation. Never edit
Linear-managed content through a local shadow copy. The durable migration map
at `docs/migrations/backlog-to-linear-map.json` preserves historical Backlog
identifiers and paths; those identifiers are not current work identifiers.

Keep one issue, one accountable agent, one authoritative branch/worktree, and
one verification result. Keep implementation issues In Progress and PRs Draft
until the owner approves them. Only the authorized closure owner may make a
Done/state transition after all acceptance criteria, focused checks, canonical
verification, documentation, and review gates have evidence. This policy
adaptation itself does not perform a Wave transition.

## Prompt shape and scope

Every active task prompt should contain only:

```text
Context
Objective
Relevant scope / architecture
Known risks or constraints
Expected verification
Allowed state transitions
/goal
```

It should reference this policy, preserve task-specific security and ownership
boundaries, and leave ordinary implementation structure and adjacent low-risk
corrections to engineering judgment. Do not begin Wave F, headroom, Next.js
16.3, Supabase, or Papermark implementation from a policy prompt.
