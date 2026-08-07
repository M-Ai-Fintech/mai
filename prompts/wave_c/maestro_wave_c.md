# Maestro — Wave C: Lifecycle, documents, and notifications

**Role:** create worktrees, plan, and hand off. Do not implement or merge.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-25` — Deal lifecycle, phases and milestones
- `MAI-26` — Documents, sources and processing
- `MAI-27` — Notifications and subscriptions

## Entry gate

Wave B is closed; MAI-16 is also Done from Wave A.

Every declared task dependency must be Done.

## Preflight

Run Linear workspace and issue/project context, fetch `origin/master`, require clean synchronized master, verify each task is active To Do with `delivery-wave-c`, and rule out duplicate branches/worktrees/PRs. Read task records, governed docs, and applicable `AGENTS.md`. Stop on any blocker.

## Worktrees

| Task | Branch | Worktree | Prompt |
|---|---|---|---|
| MAI-25 | `delivery/MAI-25-deal-lifecycle-phases-and-milestones` | `../mai-worktrees/wave_c/MAI-25` | `MAI-25.md` |
| MAI-26 | `delivery/MAI-26-documents-sources-and-processing` | `../mai-worktrees/wave_c/MAI-26` | `MAI-26.md` |
| MAI-27 | `delivery/MAI-27-notifications-and-subscriptions` | `../mai-worktrees/wave_c/MAI-27` | `MAI-27.md` |

Create every branch from the same verified `origin/master` commit. One task per branch/worktree.

## Planning

For each worktree:

1. inspect current behavior, files, tests, migrations, consumers, and exclusions with focused `rg`;
2. compare planned files across the wave and eliminate unsafe overlap;
3. write `## Wave C execution plan — <TASK-ID>` into local root `AGENTS.md`;
4. include outcome, evidence, slices, exclusive files, tests, rollout/rollback, risks/checkpoints, and exclusions;
5. persist the same plan with the Linear issue description or plan metadata;
6. keep `AGENTS.md` uncommitted and mark it `skip-worktree`;
7. leave the task To Do until implementation begins.

Use `prompts/OPERATING_RULES.md` for every plan's model route; record a written deep architecture, security, or planning justification if Sol is selected. Return the base commit, gate result, worktree/branch matrix, plan status, collision analysis, parallel launch groups, merge order, blockers, and confirmation that no implementation or Graphify ran.
