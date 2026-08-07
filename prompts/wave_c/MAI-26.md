# MAI-26 — Documents, sources and processing

**Skill:** `$solve-mai`  
**Wave:** C — Lifecycle, documents, and notifications

Read `prompts/OPERATING_RULES.md`. Work only in the branch/worktree created by `maestro_wave_c.md`; do not create or switch branches.

The maestro prepares the plan and places it in local `AGENTS.md`.

Before execution, read:

```markdown
## Wave C execution plan — MAI-26
```

Stop if it is absent or conflicts with Linear. Never stage or commit the local plan.

Invoke:

```text
$solve-mai MAI-26
```

## Focus

Deliver Documents, immutable Document Versions, Document Sources, Connector Accounts, upload negotiation, checksums, object references, provider ports, sync/processing jobs, retries, and isolation.

## Boundary

Do not certify live providers, make local directories authoritative, or approve evidence/findings.

## Overrides and completion

use focused `rg`, source/tests, and governed docs. Set In Progress when work starts. Follow the approved plan, use TDD/regression tests, task-specific checks, and `deno task verify`. Record exact evidence, migration, rollout, and rollback. Open a human-reviewable PR containing `MAI-26`; never self-merge. Do not mark Done.

Return branch, plan, implementation, files, tests, Linear evidence, PR, and human actions.
