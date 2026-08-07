# Finish — Wave B: Deal core

**Run only after:** every task PR below is owner-approved and merged into `master`.

- `MAI-24` — Deal management, parties and mandate

Read `prompts/OPERATING_RULES.md` and Linear completion context. Require clean synchronized master, merged PR evidence, no unresolved review/replacement PR, and consistent dependencies.

For each task, inspect the merged source and full task record. Verify plan conformance, bounded ownership, ACs, DoD, meaningful tests, authorization/isolation, provenance, concurrency/idempotency, failures/retries, migration/rollback, and operator evidence as applicable.

Run focused/task-specific checks and:

```bash
deno task verify
```

Do not repair feature code here. On any defect, record evidence, leave affected tasks In Progress, and return an exact corrective PR instruction.

## Graphify

Only after all merged-source review and verification are green, run exactly once:

```bash
graphify update .
```

Verify generated files and `git diff --check`.

## Finalize

Using Linear issue/document tools only, check AC/DoD items supported by current evidence and set each issue Done only when every gate passes. Do not move tasks to `Linear/completed`.

Remove only merged local worktrees/branches. Commit only Linear completion context and generated Graphify changes to master as:

```text
docs: close delivery wave B
```

Push master. Return review evidence, tests, Graphify result, task statuses, defects, cleanup, files, and finalization commit. Confirm no feature implementation occurred.
