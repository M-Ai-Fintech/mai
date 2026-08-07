# Intake

Establish the task boundary, project state, and authority before planning or editing.

## Inputs

- A concrete task ID such as `MAI-86`.
- The current repository, normally `/home/luis/mai`.
- The owner's requested outcome and any explicit authorization for remote writes.

## Workflow

1. Invoke `$model-selection` for intake and routing.
2. Use Linear issue and document tools.
3. Use Linear issue and document tools to read:
   - the Linear workspace and issue/project context;
   - the Linear issue/project context;
   - `Linear issue lookup` for the task ID.
4. Extract and reconcile:
   - outcome and scope boundaries;
   - status, assignee, priority, labels, and milestone;
   - acceptance criteria and current checked state;
   - project and task-specific Definition of Done;
   - dependencies, references, documentation, plan, notes, and comments;
   - declared modified files.
5. If the task ID is unknown, use `Linear issue search` before proposing any new task. Do not create duplicate work.
6. Read every applicable `AGENTS.md`.
7. Inspect the local repository:
   - `git branch --show-current`;
   - `git status --short`;
   - recent relevant commits and branches;
   - the current upstream, if one exists.
8. Check for duplicate ownership:
   - `Linear issue search` for the affected behavior or files;
   - local and remote branches containing the task ID;
   - commits containing the task ID;
   - existing PRs when GitHub access is available.
9. Identify unrelated tracked and untracked changes. Preserve them throughout the task.
10. When execution is authorized and prerequisites pass, use `Linear issue update` to set `status: "In Progress"` and the known assignee. Do not alter unrelated task fields.

## Blockers

Stop before project edits when:

- a dependency is incomplete;
- another active task, branch, or PR owns the same work;
- the requested outcome conflicts with acceptance criteria;
- the worktree cannot be isolated safely;
- required project instructions or task context are missing.

Record a durable blocker with `Linear issue update with appended notes` when it affects handoff. Use Linear issue comments for a decision that requires owner input.

## Completion gate

Intake is complete only when:

- the exact task and repository are known;
- task instructions and completion gates are understood;
- authority for local and remote actions is explicit;
- duplicate work has been ruled out or reconciled;
- unrelated worktree changes are identified;
- task status and ownership match reality.

Output the task boundary and blockers. Do not edit project files yet.
