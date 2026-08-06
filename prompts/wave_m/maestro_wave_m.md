# Maestro — Wave M: Release gate

**Model:** 5.6 Terra Medium. Do not implement, merge, or run Graphify.

Read `prompts/OPERATING_RULES.md`.

## Task

- `MAI-131` — End-to-end, security and operational release gate

## Entry gate

Wave L is closed; MAI-126, MAI-127, MAI-129, MAI-148, and MAI-151 are Done, and
every declared dependency is Done.

Require clean synchronized master, MAI-131 active To Do with `delivery-wave-m`,
and no duplicate release-gate branch or PR.

Create `delivery/MAI-131-end-to-end-security-and-operational-release-gate` at
`../mai-worktrees/wave_m/MAI-131` from verified master.

Plan with Terra using focused `rg`: workflow/E2E, roles and external isolation,
human authority, concurrency/idempotency, jobs/recovery, audit reconstruction,
provider failures, backup/restore, operational evidence, P0/P1 handling, and
final production-candidate decision. Write `## Wave M execution plan — MAI-131`
in local `AGENTS.md`, persist with Backlog `planSet`, keep
uncommitted/`skip-worktree`, and leave To Do until Luna starts.

Return base, gate, worktree, plan/test-stream matrix, blockers, and confirmation
no implementation or Graphify ran.

## Required within-task delegation design

For each task plan, define:

- authoritative task coordinator;
- proposed read-only subagents;
- proposed writing slices;
- one concrete `/goal` draft per proposed subagent;
- exclusive paths per writing slice;
- forbidden shared paths;
- coordinator-owned shared and integration files;
- maximum concurrent subagents;
- maximum concurrent writers;
- slice dependencies;
- integration order;
- slice-level checks;
- final task-wide verification.

Do not spawn implementation subagents from the maestro. The maestro plans the
delegation model; the Luna task coordinator executes it after the task start
gate.
