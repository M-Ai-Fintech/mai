---
name: backlog-mcp
description: >
  Manage MAI tasks, milestones, and governed documents through the Backlog.md
  CLI. Use for Backlog search, creation, execution updates, and finalization.
---

# Backlog Workflow

Backlog.md is the project system of record. Use the `backlog` CLI for every read
and write. Never edit Backlog task, document, decision, draft, or milestone
Markdown directly.

## Start

1. Run `backlog instructions overview` at the start of every request.
2. Decide whether the request needs tracked work.
3. Search before creating a task.
4. Read the lifecycle guide before acting:
   - `backlog instructions task-creation` before task creation.
   - `backlog instructions task-execution` before planning or implementation.
   - `backlog instructions task-finalization` before completion.
5. Run `backlog <command> --help` before an unfamiliar operation.

Track implementation, investigation, refactoring, design decisions, and work
that requires a handoff. Skip task creation for explanations, lookups, and small
mechanical edits.

## Discover

For a known task, run:

```bash
backlog task view MAI-123 --plain
```

For an unknown task, search narrowly and inspect likely matches:

```bash
backlog search "authentication failure" --plain
backlog task list --status "In Progress" --assignee @codex --limit 20 --plain
```

Read the full task before acting. Confirm its description, acceptance criteria,
dependencies, references, documentation, plan, notes, and declared modified
files.

Completion: one task is selected, or the search evidence shows no matching task
exists.

## Create

Read `task-creation`, search for duplicates, and inspect command help:

```bash
backlog task create --help
```

### MAI task ID convention

- Create every task as a top-level task with the next global `MAI-<integer>` ID.
- Never use `--parent`, `-p`, or `parentTaskId`; Backlog parent relationships
  generate decimal IDs, which this repository does not use.
- Represent initiative membership with milestones, labels, descriptions,
  references, and dependencies.
- For bulk creation, create one task first and verify its ID matches
  `^MAI-[0-9]+$` before creating the remainder.
- If any created ID contains a decimal, stop immediately and correct the task
  structure before continuing.

Create one independently deliverable outcome. Use an action-oriented title, a
description that states why and bounds scope, and observable acceptance
criteria. Add priority, assignee, labels, milestone, dependencies, references,
documentation, and modified files only when supported by known context.

Split work when independent outcomes can be reviewed or prioritized separately.
Never invent dependency IDs or use parent relationships for topical grouping.

Completion: the task is non-duplicative, testable, correctly related, and ready
for execution.

## Execute

Read `task-execution`, view the task again, and inspect edit help:

```bash
backlog task edit MAI-123 --help
```

Before implementation:

1. Confirm dependencies and scope permit execution.
2. Set the task to `In Progress` and assign the known owner.
3. Record an implementation plan covering discovery, changes, tests,
   verification, and handoff.

Work in focused loops. After meaningful slices, append evidence with exact
commands and outcomes. Keep status, plan, modified files, blockers, risks, and
follow-ups synchronized with reality.

Check acceptance criteria only when direct evidence proves them. Read the task
immediately before index-based checks or removals to avoid index drift. Preserve
all unrelated values when replacing list fields.

If discovered work exceeds the approved criteria, stop and ask whether to expand
the task or create follow-up work.

Completion: the task record is an accurate execution log rather than a promise
of future work.

## Governed Documents

Use Backlog document commands for architecture, specifications, guides, and
project references:

```bash
backlog doc --help
```

Search and read the authoritative document before updating it. Create a new
document only when no governed source already owns the meaning. Do not create
project-root Markdown as a substitute.

## Finalize

Read `task-finalization`. Before setting a task to `Done`, verify:

- every acceptance criterion has evidence;
- focused tests and justified broader checks passed;
- documentation and modified-file records are current;
- final summary, risks, blockers, and follow-ups are recorded;
- required human review or approval exists.

Use the normal task edit workflow to set `Done`. Use archive or completed-folder
operations only for their documented maintenance purposes, never as a substitute
for finalization.

Completion: another contributor can understand the delivered outcome, exact
verification, remaining risk, and required human action from the task alone.

## Unsupported Operations

If the installed CLI does not expose a requested operation:

1. Run the relevant `--help` command to confirm.
2. Report the missing capability.
3. Do not edit Backlog Markdown or silently substitute different semantics.
4. Offer the nearest safe operation only when it preserves the owner’s intent.

## Final Check

Before ending a Backlog operation, confirm the correct lifecycle guide and CLI
command were used, unrelated values were preserved, completion claims have
evidence, and no governed file was edited directly.
