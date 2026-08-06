# Implementation

Implement the approved plan on the isolated task branch while preserving
unrelated work.

## Preconditions

- Intake and discovery gates passed.
- The approved plan is stored in Backlog.
- Required investigation has selected an evidence-backed path.
- The current branch and worktree are safe for task-scoped edits.

## Subagent coordination

The Luna task coordinator reads `prompts/SUBAGENT_RULES.md`, determines whether
the approved plan has safely separable slices, and creates the ownership matrix
before delegation. Reserve shared paths for the coordinator. Issue a concrete
`/goal` to every subagent. Read-only investigation and review agents may run
freely; writing agents must use scratch worktrees or patch-only handoffs and
must never write concurrently to the authoritative worktree.

Integrate results one at a time, running affected checks after each integration.
Run complete task verification only after all accepted integrations.

```text
/goal <imperative slice outcome>

Task: <MAI-ID>
Slice: <bounded responsibility>
Base SHA: <exact SHA>
Exclusive paths:
- <path>

Forbidden shared paths:
- <path>

Required behavior:
- <requirement>

Required tests:
- <command or test responsibility>

Return:
- commit or patch
- exact changed paths
- checks and results
- risks
- PASS or FAIL

Stop when:
- an unassigned file is required
- the approved plan is inconsistent
- a dependency is missing
- a required invariant cannot be preserved
```

## Workflow

1. Invoke `$model-selection` for implementation.
2. Re-read the approved plan and the relevant source and tests.
3. Establish regression coverage before or with the fix:
   - use `$tdd` when test-first development is appropriate;
   - otherwise prove the old behavior through the narrowest reliable
     reproduction.
4. Implement one coherent slice at a time.
5. Use `apply_patch` for manual file edits. Use formatters or generators only
   for mechanical output they own.
6. Preserve public contracts, domain invariants, error semantics, and security
   boundaries unless the task explicitly changes them.
7. Keep configuration, migration, generated-file, and environment changes
   explicit.
8. Re-read each changed file after editing.
9. Use `rg` to find:
   - callers and consumers;
   - renamed or removed identifiers;
   - duplicated constants or stale terminology;
   - tests and documentation affected by the change.
10. Run the narrowest useful check after each slice. Do not defer all feedback
    until final verification.

## Scope control

When implementation reveals work outside the approved plan or acceptance
criteria:

1. stop the current slice;
2. explain the new work and why it is required;
3. ask whether to expand the task or create a follow-up;
4. update the Backlog plan only after approval.

Do not mix cleanup, refactoring, or unrelated fixes into the task because the
files are already open.

## Backlog record

After a meaningful slice:

- use `task_edit.notesAppend` for decisions, useful findings, and intermediate
  verification;
- use `task_edit.modifiedFiles` with the complete current task-scoped path list;
- use `addReferences` or `addDocumentation` when new authoritative context
  appears;
- keep status aligned with reality.

Do not check acceptance criteria until verification provides direct evidence.

## Completion gate

Implementation is complete only when:

- every approved slice exists;
- regression coverage exercises the changed behavior;
- modified files are task-scoped;
- unrelated worktree changes remain intact;
- stale identifiers and consumers were checked;
- generated and temporary artifacts are intentional;
- Backlog records material implementation facts and current modified files.

Proceed to verification with uncommitted changes unless the repository workflow
explicitly requires an earlier commit.
