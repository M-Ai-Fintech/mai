# Governed Delegation Rules

`prompts/OPERATING_RULES.md` is authoritative. This file applies only after its
single-agent default has been assessed and a coordinator has documented why
delegation is materially faster and safe.

## Required goal and ownership

Every delegated worker receives a concrete `/goal` as its first substantive
instruction. It states the exact result, exclusive paths, forbidden shared
paths, required checks, return artifact, and stop conditions. “Help with the
task” and “review the code” are not goals.

Before any writing delegation, record:

| Slice | `/goal` | Exclusive paths | Forbidden shared paths | Dependencies | Checks | Integration order |
| --- | --- | --- | --- | --- | --- | --- |

No two writers own the same path. Shared registries, public exports, runtime
composition, migration indexes, task-wide test support, Backlog, PR metadata,
and Graphify outputs remain with one coordinator unless the plan names exactly
one safer owner.

## Safe execution

Writers use isolated scratch worktrees or patch-only handoffs created from the
same base SHA. Never let writers modify the authoritative worktree
concurrently. Integrate one result at a time and run its focused format, lint,
type, and test checks before accepting the next result.

Read-only parallel work is allowed only when it answers disjoint questions and
materially reduces elapsed time. It does not create an independent review
swarm. No worker updates Backlog, merges, pushes, marks Done, runs Graphify,
or claims whole-task completion.

## Completion packet

Each worker returns its `/goal`, base SHA, commit or patch identifier, exact
files, commands and terminal results, assumptions, risks, conflicts,
integration order, and a binary `PASS` or `FAIL`. A skipped, timed-out,
unavailable, or interrupted required check is non-passing.

The coordinator alone owns the task-wide verification, Backlog evidence,
state transition, commit, push, and final handoff.
