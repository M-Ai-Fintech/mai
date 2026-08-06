# Delivery Prompt Operating Rules

## Model policy

- **5.6 Terra Medium:** wave maestro and wave finisher.
- **5.6 Luna Max:** task implementation, verification, and PR preparation.
- **5.6 Sol High:** planning only for the explicitly listed cross-cutting tasks.
- These assignments override `$model-selection` for the primary run.

## Lifecycle

1. Run the wave maestro.
2. Run any `plan_MAI-XXX.md` files with Sol.
3. Run each `MAI-XXX.md` in its assigned worktree with Luna.
4. The owner reviews and merges every task PR.
5. Run the wave finisher with Terra.
6. Start the next wave only after dependencies are Done.

## Authority and safety

- Backlog is the system of record; use Backlog CLI/MCP only.
- `$solve-mai` controls task execution.
- Dependencies are the real start gate; wave labels are scheduling metadata.
- One task means one authoritative branch, one authoritative worktree, one
  coordinator, one Backlog record, and one PR.
- A task coordinator may use governed subagents under
  `prompts/SUBAGENT_RULES.md`.
- Writing subagents must use isolated scratch worktrees or patch-only handoffs.
- Multiple writing agents must never modify the same worktree concurrently.
- Task agents never self-merge and never mark tasks Done.
- Finishers mark Done only after merged-source review and green verification.
- Preserve bounded-context ownership, human authority, tenant/workspace/Deal
  isolation, provenance, rollback, and failure semantics.

## Multi-subagent lifecycle

1. The task coordinator reads the approved task plan.
2. The coordinator records a slice and file-ownership matrix.
3. Every subagent receives a concrete `/goal`.
4. Read-only subagents may run in parallel.
5. Writing subagents receive disjoint paths and isolated scratch worktrees or
   patch-only assignments.
6. Subagents return completion packets to the coordinator.
7. The coordinator integrates accepted work serially.
8. Only the coordinator updates Backlog, performs task-wide verification,
   prepares the task PR, and reports the task result.

When `SUBAGENT_RULES.md` and a task prompt apply, both are mandatory. The
narrower task plan controls slice scope; the central subagent rules control
coordination and safety.

## Graphify policy

No maestro, Sol planner, or Luna implementer may run Graphify.

Only `finish_wave_x.md` may run one:

```bash
graphify update .
```

It runs after every PR in the wave is merged and verification is green. During
discovery use focused `rg`, source/tests, task references, and governed
documentation.

## Worktree plan policy

The maestro stores the approved plan in the task worktree root `AGENTS.md`
under:

```markdown
## Wave X execution plan — MAI-XXX
```

It also stores the plan through Backlog `planSet`. The local `AGENTS.md` change
must remain uncommitted and outside the PR; mark it `skip-worktree`.

## Standard implementation gate

Every Luna task run must:

- read the local plan;
- set the task In Progress when work starts;
- use TDD/regression coverage;
- run focused checks and `deno task verify`;
- record exact evidence in Backlog;
- open a human-reviewable PR;
- leave the task In Progress for the finisher.

## Prohibitions

No shared task branch, dependency bypass, direct Backlog Markdown edit, fake
success, silent fallback, self-approval, self-merge, premature Done status, or
committed local plan block.
