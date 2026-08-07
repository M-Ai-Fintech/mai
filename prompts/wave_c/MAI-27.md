# MAI-27 — Notifications and subscriptions

**Skill:** `$solve-mai`  
**Wave:** C — Lifecycle, documents, and notifications

Read `prompts/OPERATING_RULES.md`. Work only in the branch/worktree created by `maestro_wave_c.md`; do not create or switch branches.

The maestro prepares the plan and places it in local `AGENTS.md`.

Before execution, read:

```markdown
## Wave C execution plan — MAI-27
```

Stop if it is absent or conflicts with Linear. Never stage or commit the local plan.

Invoke:

```text
$solve-mai MAI-27
```

## Focus

Deliver recipient-safe notifications, subscriptions, projections, and delivery jobs with retry/expiry and tenant isolation.

## Boundary

Do not mutate source domains, implement marketing broadcast, or conflate events with required approvals.

## Overrides and completion

Use focused `rg`, source/tests, governed docs, and Linear issue/document tools. Set In Progress when work starts. Follow the plan, use TDD/regression tests and `deno task verify`, record exact evidence, open a PR containing `MAI-27`, never self-merge, and do not mark Done.

Return branch, plan, implementation, files, tests, Linear evidence, PR, and human actions.
