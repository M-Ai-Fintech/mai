# Finalization

Make Linear the accurate final handoff and set the task to Done only when every required gate has passed.

## Workflow

1. Invoke `$model-selection` for finalization.
2. Through `Linear issue and document tools`, read:
   - the Linear completion context;
   - the latest task state with `Linear issue lookup`.
3. Reconcile the task against the repository and PR:
   - final outcome and scope;
   - current status and assignee;
   - acceptance criteria;
   - project and task-specific DoD;
   - modified files;
   - verification evidence;
   - documentation and references;
   - PR, commits, checks, and human review;
   - risks, migrations, manual steps, and follow-ups.
4. Correct stale metadata through `Linear issue update` without replacing unrelated values.
5. Write or replace the final summary only after the evidence is complete. Include:
   - what changed;
   - exact tests and outcomes;
   - PR and commit references;
   - risks and operational steps;
   - linked follow-ups;
   - any owner action still required.
6. Check only criteria and task-specific DoD items backed by evidence.

## Status decision

Set `status: "Done"` through `Linear issue update` only when:

- every required acceptance criterion is checked;
- applicable DoD is complete;
- required verification passes;
- when available, `deno task verify` has passed and its exact evidence is recorded;
- documentation and modified files are current;
- required PR checks pass;
- required human approval exists;
- no blocker represents unfinished required scope.

Keep `status: "In Progress"` when review, checks, environment validation, or owner action remains. State the exact next action.

Do not call `issue completion` during normal finalization. That tool moves already-Done tasks into the completed folder during periodic cleanup. Do not call `issue archival`; archive is for duplicate, canceled, or invalid work.

## Final handoff

Report:

```text
MAI-N: <result>.
Changes: <files and commits>.
Verification: <commands and outcomes>.
Linear: <status and recorded updates>.
PR: <URL and review/check state>.
Pending: <remaining risk or owner action>.
```

Use `$caveman` for routine wording without dropping evidence.

## Completion gate

Finalization is complete when:

- Linear matches repository and PR reality;
- completion claims have direct evidence;
- the final summary is reviewable by another person;
- status reflects the remaining work accurately;
- no cleanup/archive operation was used as a substitute for Done.
