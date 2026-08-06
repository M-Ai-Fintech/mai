# Governed Subagent Rules

This is the authoritative contract for within-task delegation. It supplements,
but never weakens, task plans, dependency gates, verification, migration,
human-authority, Backlog, or Graphify rules.

## Task authority

Each task has exactly one task coordinator, authoritative task branch,
authoritative task worktree, Backlog task record, task PR, and integrated
verification result. Subagents assist the coordinator; they do not independently
own or complete the task.

## Required `/goal` use

Every spawned subagent must receive `/goal` as its first substantive
instruction. The coordinator must use a concrete goal rather than a generic role
label.

Valid example:

```text
/goal Implement the MAI-114 Approval Request persistence slice within the assigned files, including deterministic idempotency and PostgreSQL regression coverage. Return a commit or patch and a completion packet. Do not modify shared files.
```

Invalid examples:

```text
/goal Help with MAI-114
```

```text
/goal Review the code
```

Each `/goal` states the exact task and slice, intended result, exclusive files
or directories, forbidden shared files, required tests, expected return
artifact, and stop conditions. Read-only agents also receive a `/goal`.

Example:

```text
/goal Review MAI-114 for authorization, separation-of-duties, and cross-scope leakage defects. Make no edits. Return only evidence-backed findings with severity, files, lines, and required corrections.
```

## Permitted subagent types

The coordinator may spawn read-only discovery, domain and architecture
investigation, exclusive-ownership implementation, test, security, data-model
and concurrency, API-contract, and verification subagents. Use subagents only
for slices that can be safely separated.

## Worktree policy

Never allow multiple writing agents to modify the authoritative task worktree
concurrently. A writing subagent must use either an ephemeral scratch worktree
and scratch branch created from the exact task-branch base SHA, or a patch-only
workflow that does not edit the coordinator worktree.

Scratch branches must not open independent PRs, update Backlog, merge to
`master`, run Graphify, mark tasks Done, or claim whole-task completion. The
coordinator integrates accepted commits or patches into the authoritative task
branch.

## Ownership matrix

Before spawning writing subagents, the coordinator records this matrix:

| Slice | Subagent | `/goal` summary | Exclusive paths | Forbidden shared paths | Dependencies | Required checks | Integration order |
| ----- | -------- | --------------- | --------------- | ---------------------- | ------------ | --------------- | ----------------- |

No two writing subagents may own the same path. Prefer directory ownership over
individual-line ownership. When ownership cannot be made disjoint, keep the work
serial under the coordinator. A subagent must stop when its change requires a
forbidden or unassigned file.

## Coordinator-owned files

Unless an approved plan explicitly provides another single owner, only the
coordinator may modify Backlog task records, root or shared `AGENTS.md`, public
barrel exports, shared route registries, runtime composition, migration indexes,
shared API clients, task-wide test support, cross-slice integration tests, PR
metadata, and Graphify outputs.

## Completion packet

Every subagent returns its `/goal`, base SHA, resulting commit SHA or patch
identifier, exact files changed, tests and checks executed with exact results,
assumptions, risks, discovered scope conflicts, recommended integration order,
and a binary slice verdict: `PASS` or `FAIL`.

A required check that failed, timed out, was skipped, was unavailable, or was
interrupted is non-passing.

## Integration

The coordinator integrates one subagent result at a time. After each
integration:

1. Inspect the full diff.
2. Confirm path ownership.
3. Check public contracts and imports.
4. Run affected format, lint, type, and focused tests.
5. Update the authoritative modified-file inventory.
6. Confirm the branch remains coherent before integrating another slice.

Only after all accepted slices are integrated may the coordinator run task-wide
verification and prepare the single task PR.

## Prohibitions

Prohibit concurrent writing in one worktree, overlapping path ownership,
independent subagent PRs, direct-to-master implementation, dependency bypass,
multiple Backlog writers, multiple migration owners, multiple Graphify writers,
self-approval, self-merge, premature Done, hidden scope expansion, and
unverified success claims.
