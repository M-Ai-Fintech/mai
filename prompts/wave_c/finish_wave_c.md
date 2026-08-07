# Finish — Wave C: Lifecycle, documents, and notifications

**Run only after:** every task PR below is owner-approved and merged into `master`.

- `MAI-111` — Deal lifecycle, phases and milestones
- `MAI-112` — Documents, sources and processing
- `MAI-123` — Notifications and subscriptions

Read `prompts/OPERATING_RULES.md` and Backlog finalization instructions. Require clean synchronized master, merged PR evidence, no unresolved review/replacement PR, and consistent dependencies.

Inspect merged source and full task records. Verify plan conformance, bounded ownership, ACs, DoD, meaningful tests, authorization/isolation, provenance, concurrency/idempotency, failures/retries, migration/rollback, and operator evidence as applicable.

Run focused/task-specific checks and `deno task verify`. Do not repair feature code here; on defects, record evidence and leave tasks In Progress.

Only after all review and verification are green, run once:

```bash
graphify update .
```

Verify generated files and `git diff --check`. Using Backlog CLI/MCP only, check supported AC/DoD items and mark each task Done only when every gate passes. Do not move tasks to `backlog/completed`.

Remove only merged local worktrees/branches. Commit only Backlog finalization and Graphify output as `docs: close delivery wave C`, push master, and confirm no feature implementation occurred.
