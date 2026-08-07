# MAI-24 — Deal management, parties and mandate

**Skill:** `$solve-mai`  
**Wave:** B — Deal core

Read `prompts/OPERATING_RULES.md`. Work only in the branch/worktree created by `maestro_wave_b.md`; do not create or switch branches.

The maestro prepares the plan and places it in local `AGENTS.md`.

Before execution, read the exact local section:

```markdown
## Wave B execution plan — MAI-24
```

Stop if it is absent or conflicts with the current Linear issue. Never stage or commit the local `AGENTS.md` plan.

Invoke:

```text
$solve-mai MAI-24
```

## Focus

Deliver Deal, Deal Party, Deal Role, Mandate, and Authority Constraint aggregates with versioned commands, repositories, projections, and APIs.

## Boundary

Do not implement lifecycle/milestones, negotiation, archive/termination, or generic Organization Registry behavior.

## Overrides and completion

- Set the task In Progress when implementation starts.
- Follow the approved plan; obtain owner approval for material deviation.
- Use TDD/regression tests, task-specific checks, and `deno task verify`.
- Record exact commands, results, files, migration/rollback evidence, and risks.
- Open a PR containing `MAI-24` in the title. Do not approve or merge it.
- Do not mark the task Done; `finish_wave_b.md` owns finalization after merge.

Return the branch, plan used, implementation, files, tests, Linear evidence, PR, and remaining human actions.
