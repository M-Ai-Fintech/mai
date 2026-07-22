---
name: solve-mai
description: >
  Resolve a MAI Backlog task end to end in /home/luis/mai: read task context, investigate,
  prevent duplicate work, implement, verify, create focused commits and a PR when authorized,
  and prepare a QA handoff. Use for "resolve MAI-N", "trata a MAI-N", "/solve-mai",
  "do começo ao fim", "manda pra QA", or complete implementation of a Backlog task.
---

# Solve MAI

Handle a MAI task from diagnosis through QA handoff.

Default to caveman communication. Keep updates short: action, target, reason.

## Inputs

- Require a task ID such as `MAI-17`.
- Work in `/home/luis/mai` unless the task explicitly references another repository.
- Treat Backlog as the source of task context and project state.

## Workflow

### 1. Load project workflow

1. Run `backlog instructions overview`.
2. Read `backlog instructions task-execution` before planning or implementation.
3. Read the applicable `AGENTS.md`.
4. Inspect `git status --short` and preserve unrelated user changes.

### 2. Read task context

Run:

```bash
backlog task view MAI-N --plain
```

Extract description, acceptance criteria, dependencies, plan, notes, referenced files, and status.

If only a description is provided, search first:

```bash
backlog search "<keywords>" --type task --plain
```

Do not create a duplicate task.

### 3. Prevent duplicate work

Before editing:

```bash
gh pr list --search "MAI-N" --state all
git branch --all --list "*MAI-N*"
git log --all --oneline --grep="MAI-N"
backlog search "<affected area>" --type task --plain
```

Stop and report the existing work when another active branch, PR, or task already owns the same change.

### 4. Investigate and choose the path

Use `$investigate` for unclear bugs. Decide explicitly between:

- runtime code;
- configuration;
- data repair or one-off script;
- documentation or process change;
- duplicate or already resolved;
- blocked dependency.

Explain the chosen path and discarded alternatives before implementation.

For Mongo/config interpretation bugs, use `$config-bug-closure` before handoff.

### 5. Update Backlog plan

Use the Backlog CLI only; never edit task Markdown directly.

```bash
backlog task edit MAI-N --status "In Progress" --plan "<implementation plan>" --plain
```

A request to solve the task authorizes task-scoped Backlog updates. Show the exact update in the handoff.

### 6. Implement

- Make the smallest coherent change.
- Preserve unrelated worktree changes.
- Use `apply_patch` for manual edits.
- Add regression coverage proportional to risk.
- Keep one focused commit per independent concern when committing is requested or required by the workflow.
- Use branch name `MAI-N` unless an existing repository convention is more specific.
- Never merge, deploy, or force-push without explicit authorization.

### 7. Cross-check

Re-read every modified file and verify identifiers with `rg`.

Run focused tests first, then broader checks justified by the change. Record exact commands and results.

Before completion, read:

```bash
backlog instructions task-finalization
```

Update modified-file references, acceptance criteria, notes, and final summary through `backlog task edit`.

### 8. PR and review

When the user requested end-to-end delivery and remote mutation is authorized:

1. Push the task branch.
2. Read the repository PR template.
3. Create a PR containing task link/ID, change summary, tests, risk, and deployment notes.
4. Monitor checks using the available recurring monitoring mechanism.
5. Apply mechanical review fixes in separate focused commits.
6. Do not merge automatically.

### 9. QA handoff

Use `$comment-backlog-task` to append a structured task comment with:

- implementation summary;
- changed files;
- acceptance criteria;
- possible impacts;
- QA scenarios and edge cases;
- test commands and results;
- PR and commit references.

Mark acceptance criteria only when verified. Set `Done` only after the task-finalization guide and task requirements permit it.

## Final output

```text
MAI-N: <result>.
Changes: <files/commits>.
Verification: <commands + outcome>.
Backlog: <status and updates>.
PR: <URL, if created>.
Pending: <remaining risks or manual steps>.
```

## Boundaries

- Never edit files under `backlog/` directly.
- Never overwrite unrelated user changes.
- Never invent test results, task status, or external actions.
- Never merge, deploy, delete data, or force-push without explicit authorization.
