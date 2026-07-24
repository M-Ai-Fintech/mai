# Verification

Prove the requested outcome, regression coverage, and completion criteria with reproducible evidence.

## Workflow

1. Invoke `$model-selection` for verification.
2. Call `task_view` through Backlog MCP immediately before mapping evidence to criteria.
3. Re-read the final diff and every modified file.
4. Run verification in increasing scope:
   - the targeted regression test or reproduction;
   - affected module tests;
   - type checking, linting, formatting, or build checks relevant to the files;
   - the smallest justified broader suite.
5. Exercise the user-visible or integration path when feasible.
6. Test negative cases, failure handling, and boundary behavior proportional to risk.
7. For configuration or provider defects, invoke `$config-bug-closure` and require its PASS gate.
8. Check documentation examples, commands, paths, links, and generated artifacts when they changed.
9. When the repository defines `deno task verify`, run it as mandatory broader evidence before claiming a task is ready for Done. Record its exact result; a failed or unavailable gate blocks completion.
10. Run `git diff --check` and inspect `git status --short`.
11. Capture exact commands, exit status, results, and environment limitations.

## Map evidence to Backlog

For each acceptance criterion:

1. identify the command, observation, or artifact that proves it;
2. keep it unchecked when evidence is partial or unavailable;
3. use `task_edit.acceptanceCriteriaCheck` with the current 1-based index only after proof;
4. use `acceptanceCriteriaUncheck` if later evidence invalidates completion.

For task-specific Definition of Done:

- use `definitionOfDoneCheck` only for directly verified items;
- keep project defaults separate from task-specific DoD;
- do not use DoD as a substitute for behavioral acceptance criteria.

Record commands and results with `notesAppend`. Record unavailable environments as blockers, not passes.

## Failure handling

- Fix a task-scoped failure, then rerun the failing check and affected broader checks.
- If the fix changes the approved implementation path, return to discovery and update the plan first.
- If a required check cannot run, keep the task In Progress and state the exact owner action needed.
- Never write "tests pass" without the commands and observed results.

## Completion gate

Verification is complete only when:

- every applicable acceptance criterion has direct evidence;
- applicable DoD items are verified;
- focused tests pass;
- justified broader checks pass;
- the user-visible path was exercised or its limitation is explicit;
- configuration closure passes when applicable;
- the worktree and diff contain only intended changes;
- Backlog contains exact verification evidence.

Unresolved required checks block review readiness.
