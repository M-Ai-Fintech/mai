---
name: backlog-mcp
description: >
  Manage MAI tasks, milestones, documents, and Definition of Done through the configured Backlog.md MCP server.
  Use when creating, reading, planning, updating, completing, archiving, or organizing Backlog project state.
---

# Backlog MCP

Backlog.md is the project system of record. Use the configured `backlog` MCP server for every read and write. Never edit task, document, decision, or milestone Markdown directly.

## Core workflow

1. Call `get_backlog_instructions` with `overview` at the start of every MAI request.
2. Decide whether the request needs tracked work:
   - Track implementation, investigation, refactoring, design decisions, or work requiring a handoff.
   - Skip task creation for questions, explanations, lookups, and obvious mechanical edits.
3. Search before creating. Use `task_search`, then inspect likely matches with `task_view`.
4. Read the applicable detailed instructions before the lifecycle action:
   - `task-creation` before creating or splitting work.
   - `task-execution` before planning, implementation, or task updates.
   - `task-finalization` before checking final criteria or completing work.
5. Keep Backlog synchronized during execution. Record plan changes, evidence, modified files, decisions, blockers, and follow-ups when they become known.

Completion: every tracked request is attached to the correct task, and Backlog reflects the real execution state.

## Tool map

### Instructions

- `get_backlog_instructions`: read `overview`, `task-creation`, `task-execution`, or `task-finalization`.

### Tasks

- `task_search`: fuzzy discovery by query, status, priority, or modified file.
- `task_list`: bounded listing by status, assignee, label, milestone, or search text.
- `task_view`: complete context for one task.
- `task_create`: create tasks, drafts, subtasks, dependencies, criteria, and task metadata.
- `task_edit`: update task state and all structured sections.
- `task_complete`: move already-Done tasks to the completed folder during periodic cleanup.
- `task_archive`: archive duplicate, canceled, or invalid work.

### Milestones

- `milestone_list`: list declared milestones and milestone values referenced by tasks.
- `milestone_add`: create a named milestone.
- `milestone_rename`: rename a milestone and optionally update tasks.
- `milestone_remove`: remove a milestone and clear, keep, or reassign task references.
- `milestone_archive`: move an active milestone out of the active set.

### Documents

- `document_search`: fuzzy document discovery.
- `document_list`: list documents with optional filtering.
- `document_view`: read one governed document.
- `document_create`: create governed project documentation.
- `document_update`: replace a document's content or metadata.

### Definition of Done

- `definition_of_done_defaults_get`: read project-level defaults.
- `definition_of_done_defaults_upsert`: replace project-level defaults.
- `task_create.definitionOfDoneAdd`: add task-specific items during creation.
- `task_edit.definitionOfDone*`: add, check, uncheck, or remove task-specific items.

## Task discovery

### Known task

Call `task_view` with the task ID. Read:

- title, description, status, priority, assignee, labels, and milestone;
- acceptance criteria and completion state;
- project and task-specific Definition of Done;
- dependencies and parent relationship;
- references and documentation;
- implementation plan, notes, comments, and final summary;
- declared modified files.

Do not act from the title alone.

Completion: the task's outcome, constraints, dependencies, and completion gates are understood.

### Unknown task

1. Use `task_search` with the narrowest useful query.
2. Add status, priority, or modified-file filters when they reduce ambiguity.
3. Use `task_list` for operational views such as an assignee's active tasks or a milestone.
4. Open candidate tasks with `task_view`.

Bound result sets. Refine the query instead of requesting an unbounded project dump.

Completion: one task is selected, or the evidence shows no matching task exists.

## Task creation

Read `task-creation` first.

### Minimum viable task

Use `task_create` with:

- `title`: action-oriented and independently deliverable;
- `description`: why the work exists, relevant context, and scope boundaries;
- `acceptanceCriteria`: observable, testable outcomes;
- `priority`: `high`, `medium`, or `low` when known;
- `status`: normally `To Do`, or `Draft` when the scope is not committed.

Good acceptance criteria describe behavior. Implementation steps belong in the plan.

### Full task metadata

Set these when they are supported by real context:

- `assignee`: explicit owners;
- `labels`: type, domain, or workflow classification;
- `milestone`: existing milestone name;
- `dependencies`: existing task IDs that must be completed first;
- `parentTaskId`: existing parent when this is a true subtask;
- `references`: issue, PR, design, or external reference links;
- `documentation`: project documentation needed to understand the task;
- `modifiedFiles`: known project-root-relative paths;
- `ordinal`: manual ordering value, preferably spaced integers;
- `definitionOfDoneAdd`: task-only completion requirements;
- `disableDefinitionOfDoneDefaults`: only when project defaults genuinely do not apply.

Never invent future dependency IDs or create a parent relationship merely for topical grouping.

### Task sizing

Prefer an atomic task that produces one coherent reviewable outcome. Split work when independent results can be reviewed, prioritized, or delivered separately.

When splitting:

1. Create the parent only if it represents a real aggregate outcome.
2. Create each child with `parentTaskId`.
3. Add dependencies only where execution order matters.
4. Give every child its own acceptance criteria.

Completion: no active task duplicates the work; the new task has a testable outcome, accurate relationships, and enough context to execute.

## Starting execution

Read `task-execution`, then call `task_view` again if the task may have changed.

1. Confirm dependencies and scope permit execution.
2. Set `status` to `In Progress` only when work is authorized.
3. Set `assignee` when ownership is known.
4. Record the approved approach with `planSet`.
5. Add documentation and references needed during execution.

The plan should state:

1. discovery or investigation;
2. implementation slices;
3. regression coverage;
4. verification;
5. documentation and handoff.

Use `planAppend` for an additive refinement. Use `planSet` when the approved approach changes materially. Use `planClear` only when the plan is intentionally being replaced or removed.

Completion: the active task has an accurate owner, status, and approved plan before implementation.

## Task editing

Use `task_edit`. Preserve fields that are not part of the requested change.

### Core metadata

- `title`: replace the title.
- `description`: replace the description.
- `status`: set `Draft`, `To Do`, `In Progress`, or `Done`.
- `priority`: set `high`, `medium`, or `low`.
- `assignee`: replace the assignee list.
- `labels`: replace labels.
- `milestone`: set or clear the milestone.
- `ordinal`: set manual ordering.
- `dependencies`: replace dependency IDs.

Before replacing a list, read the task and include every value that must remain.

### Acceptance criteria

- `acceptanceCriteriaAdd`: append criteria.
- `acceptanceCriteriaSet`: replace the complete criteria list.
- `acceptanceCriteriaCheck`: check criteria by 1-based index.
- `acceptanceCriteriaUncheck`: uncheck by 1-based index.
- `acceptanceCriteriaRemove`: remove by 1-based index.

Read the task immediately before index-based operations. For multiple removals, reason from the current list and avoid index drift.

Check a criterion only when direct evidence proves it. Never infer completion from code presence alone.

### Task-specific Definition of Done

- `definitionOfDoneAdd`: append task-only checks.
- `definitionOfDoneCheck`: check by 1-based index.
- `definitionOfDoneUncheck`: uncheck by 1-based index.
- `definitionOfDoneRemove`: remove by 1-based index.

Project defaults and task-specific items are separate. Change defaults through the dedicated DoD tools, not by duplicating them onto every task.

### Plan, notes, and comments

- `planSet`, `planAppend`, `planClear`: maintain the implementation plan.
- `notesSet`, `notesAppend`, `notesClear`: maintain implementation evidence and handoff notes.
- `commentsAppend`: add durable review questions, decisions, or discussion.
- `commentAuthor`: identify the comment author when needed.
- `implementationNotes`: replace the implementation-notes field when supported by the task version.

Use notes for the implementation record. Use comments for discussion. Do not hide an unresolved scope decision inside implementation notes.

### References, documentation, and files

- `references`: replace all references.
- `addReferences`, `removeReferences`: update references incrementally.
- `documentation`: replace all documentation links.
- `addDocumentation`, `removeDocumentation`: update documentation incrementally.
- `modifiedFiles`: replace the complete project-root-relative file list.

References explain why or where work originated. Documentation explains how to understand or operate it. Modified files support review and handoff; keep the list exact.

### Final summary

- `finalSummary`: replace the completion summary.
- `finalSummaryAppend`: append completion details.
- `finalSummaryClear`: remove an invalid or premature summary.

Write the final summary only after implementation and verification are complete. Include outcome, tests, risks, PR, manual steps, and follow-ups.

Completion: changed fields match the real project state; unchanged fields remain intact.

## Execution notes

Update the task after meaningful slices, not after every command.

Good notes include:

```markdown
## Changes
- <implemented behavior>
- <important design choice>

## Verification
- `<exact command>` — <result>

## Risks
- <remaining risk or "None identified">

## Follow-up
- <linked task or remaining owner action>
```

Record:

- exact verification commands and outcomes;
- environment limitations;
- scope changes and approved rationale;
- modified files;
- unresolved blockers;
- follow-up task IDs.

If discovered work is outside the acceptance criteria, stop and ask whether to expand the task or create follow-up work. Do not silently absorb it.

## Finishing and cleanup

Read `task-finalization` first.

### Completion gate

Before setting `status` to `Done`, verify:

1. every acceptance criterion is checked with evidence;
2. every applicable project and task-specific DoD item is complete;
3. focused tests and justified broader checks pass;
4. documentation is current;
5. modified files are recorded;
6. final summary and risks are recorded;
7. the required review or owner approval exists;
8. follow-ups are linked and do not conceal incomplete required scope.

`Done` means the outcome is delivered and reviewable. It does not mean an implementation attempt exists.

Set `status` to `Done` through `task_edit` for normal finalization. Done tasks remain in the Done column until periodic cleanup.

Use `task_complete` only for the periodic operation that moves already-Done tasks into the completed folder. Use `task_archive` only for duplicate, canceled, or invalid tasks. Neither tool is a substitute for setting an implemented task to Done.

Completion: the task record contains enough evidence for another person to understand what changed and why it is complete.

## Milestones

### List and inspect

Use `milestone_list` before creating, renaming, removing, or assigning a milestone. Names are case-insensitively unique.

### Create

Use `milestone_add` with:

- `name`: concise milestone name;
- `description`: outcome and scope when useful.

Do not create a milestone when a label or parent task is sufficient.

### Rename

Use `milestone_rename` with:

- `from`: exact existing name;
- `to`: new unique name;
- `updateTasks`: normally `true`.

Set `updateTasks` to `false` only when existing task references intentionally retain the old value.

### Remove

Use `milestone_remove` and choose task handling explicitly:

- `clear`: remove the milestone from affected tasks;
- `keep`: preserve task values even though the milestone file is removed;
- `reassign`: move affected tasks to `reassignTo`, which must already exist.

Resolve the affected task set before removal. Milestone removal can change many task records.

### Archive

Use `milestone_archive` when the milestone should leave the active set but remain part of project history.

Completion: milestone state and every affected task reference agree.

## Documents

Use governed Backlog documents for architecture, specifications, guides, references, and project documentation. Do not create standalone project-root Markdown as a substitute.

### Discover

1. Use `document_search` for fuzzy discovery.
2. Use `document_list` for a bounded inventory.
3. Use `document_view` before updating a candidate.

### Create

Use `document_create` with:

- `title`: clear and searchable;
- `content`: complete Markdown body;
- `type`: `readme`, `guide`, `specification`, or `other`;
- `path`: optional docs subdirectory;
- `tags`: stable search terms.

Search first. Update an existing authoritative document instead of creating a competing source of truth.

### Update

Use `document_update` with the document ID and full replacement `content`. Preserve title, type, path, and tags unless the request changes them.

Completion: one authoritative governed document contains the current information.

## Decisions and unsupported CLI branches

The reference CLI skill also covers decisions, drafts, promotion/demotion, board views, reports, browser views, task history, and task diffs. The configured MCP server currently exposes no dedicated tools for those branches.

When one is requested:

1. State which capability is unavailable through MCP.
2. Do not edit Backlog Markdown directly.
3. Do not silently emulate a decision record as an ordinary task.
4. Offer the nearest safe MCP operation only when semantics are preserved:
   - a governed `document_create` with type `other` may hold decision analysis if the owner explicitly accepts that it is not a native decision record;
   - `task_list` can provide the data for a textual status summary, but it is not a persisted board or report;
   - `Draft` status can create draft work, but no MCP promotion/demotion operation exists.
5. Ask the owner to use the Backlog CLI or attach an MCP version exposing the missing operation when exact semantics matter.

Completion: unsupported behavior is explicit; no direct-file workaround or semantic substitution occurred.

## Project Definition of Done

Use `definition_of_done_defaults_get` before changing defaults.

`definition_of_done_defaults_upsert` replaces the entire project-level list. Therefore:

1. Read the current defaults.
2. Construct the complete intended replacement.
3. Confirm broad changes when they affect future tasks.
4. Upsert the complete list.
5. Read the defaults again to verify.

Do not copy project defaults into `definitionOfDoneAdd`; new tasks inherit defaults unless `disableDefinitionOfDoneDefaults` is intentionally set.

Completion: the stored defaults exactly match the intended project-wide completion standard.

## Common workflows

### Daily execution

1. `task_list` active tasks for the current assignee.
2. `task_view` the selected task.
3. Read `task-execution`.
4. Update status, assignee, and plan.
5. Append evidence after meaningful slices.
6. Check criteria as evidence becomes available.

### Bug fix

1. Search for the defect before creating work.
2. Create an atomic bug task with the symptom and outcome-focused criteria.
3. Record root cause and fix in notes.
4. Record regression commands and results.
5. Complete only after the reported path and regression coverage pass.

### Planning

1. List or search candidate tasks.
2. Inspect each task before changing priority, milestone, dependencies, or assignee.
3. Apply bounded updates.
4. Re-list the affected set to verify organization.

### Documentation

1. Search documents.
2. View the authoritative candidate.
3. Create only when none exists; otherwise update.
4. Link the document to related tasks through task documentation fields.

## Quality rules

- Titles are concise, action-oriented, and independently deliverable.
- Descriptions explain why the work exists and define scope.
- Acceptance criteria are observable outcomes, not implementation instructions.
- Dependencies reference existing tasks and represent real execution order.
- Labels and milestones use existing project vocabulary.
- Plans are approved before implementation when approval is expected.
- Notes are PR-ready and evidence-based.
- Criteria and DoD are checked as evidence appears.
- Final summaries are written only at completion.
- One authoritative task or document owns each meaning.

## Troubleshooting

### Task not found

Use `task_search` with title fragments, then `task_list` with status or milestone filters. Do not guess an ID.

### Index-based criteria changed

Call `task_view` again before checking, unchecking, or removing criteria or DoD items.

### Replacement would discard values

Read the task first and reconstruct the complete intended list. Prefer incremental add/remove fields when available.

### Remote task loading fails

Report the exact MCP error. Use known local task IDs only when `task_view` can still verify them. Do not claim a global duplicate search succeeded.

### MCP unavailable

Report the missing server or tool and ask the owner to refresh the session. Read-only CLI inspection may be proposed when project instructions permit it; state-changing work remains blocked unless the owner explicitly authorizes the CLI path.

## Final check

Before ending any Backlog operation, confirm:

- the correct tool and lifecycle instructions were used;
- no task, document, decision, or milestone file was edited directly;
- replacements preserved unrelated values;
- every completion claim has evidence;
- project state matches the user-visible summary;
- unsupported branches were reported instead of improvised.
