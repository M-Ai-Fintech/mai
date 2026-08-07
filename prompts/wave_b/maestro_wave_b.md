# Maestro — Wave B: Deal core

**Role:** create worktrees, plan, and hand off. Do not implement or merge.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-110` — Deal management, parties and mandate

## Entry gate

Wave A is closed and MAI-107 and MAI-108 are Done.

Every declared task dependency must be Done.

## Preflight

Run Backlog overview/execution instructions, fetch `origin/master`, require clean synchronized master, verify each task is active To Do with `delivery-wave-b`, and rule out duplicate branches/worktrees/PRs. Read task records, governed docs, and applicable `AGENTS.md`. Stop on any blocker.

## Worktrees

| Task | Branch | Worktree | Prompt |
|---|---|---|---|
| MAI-110 | `delivery/MAI-110-deal-management-parties-and-mandate` | `../mai-worktrees/wave_b/MAI-110` | `MAI-110.md` |

Create every branch from the same verified `origin/master` commit. One task per branch/worktree.

## Planning

For each worktree:

1. inspect current behavior, files, tests, migrations, consumers, and exclusions with focused `rg`;
2. compare planned files across the wave and eliminate unsafe overlap;
3. write `## Wave B execution plan — <TASK-ID>` into local root `AGENTS.md`;
4. include outcome, evidence, slices, exclusive files, tests, rollout/rollback, risks/checkpoints, and exclusions;
5. persist the same plan with Backlog `planSet`;
6. keep `AGENTS.md` uncommitted and mark it `skip-worktree`;
7. leave the task To Do until implementation begins.

Use `prompts/OPERATING_RULES.md` for every plan's model route; record a written deep architecture, security, or planning justification if Sol is selected.

Return the base commit, gate result, worktree/branch matrix, plan status, collision analysis, parallel launch groups, merge order, blockers, and confirmation that no implementation or Graphify ran.
