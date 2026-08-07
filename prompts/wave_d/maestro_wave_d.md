# Maestro — Wave D: Evidence

**Role:** create worktrees, plan, and hand off. Do not implement or merge.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-28` — Evidence, citations, facts, interpretations, assumptions and calculations

## Entry gate

Wave C is closed and MAI-26 is Done. Every declared dependency must be Done.

Run Linear workspace and issue/project context, fetch `origin/master`, require clean synchronized master, verify MAI-28 is active To Do with `delivery-wave-d`, and rule out duplicate work.

Create:

| Task | Branch | Worktree | Prompt |
|---|---|---|---|
| MAI-28 | `delivery/MAI-28-evidence-citations-facts-interpretations-assumptions-and-calculations` | `../mai-worktrees/wave_d/MAI-28` | `MAI-28.md` |

From the verified master commit, inspect current behavior with focused `rg`; write `## Wave D execution plan — MAI-28` into local root `AGENTS.md`; include outcome, evidence, slices, exclusive files, tests, rollout/rollback, risks/checkpoints, and exclusions; persist it with the Linear issue description or plan metadata; keep it uncommitted and `skip-worktree`; leave the task To Do until implementation starts.

Use `prompts/OPERATING_RULES.md` for the model route and record a written deep architecture, security, or planning justification if Sol is selected. Return base commit, gate, worktree/branch, plan status, collision analysis, blockers, and confirmation that no implementation or Graphify ran.
