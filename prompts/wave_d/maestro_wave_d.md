# Maestro — Wave D: Evidence

**Model:** 5.6 Terra Medium  
**Role:** create worktrees, plan, and hand off. Do not implement, merge, or run Graphify.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-113` — Evidence, citations, facts, interpretations, assumptions and calculations

## Entry gate

Wave C is closed and MAI-112 is Done. Every declared dependency must be Done.

Run Backlog overview/execution instructions, fetch `origin/master`, require clean synchronized master, verify MAI-113 is active To Do with `delivery-wave-d`, and rule out duplicate work.

Create:

| Task | Branch | Worktree | Prompt |
|---|---|---|---|
| MAI-113 | `delivery/MAI-113-evidence-citations-facts-interpretations-assumptions-and-calculations` | `../mai-worktrees/wave_d/MAI-113` | `MAI-113.md` |

From the verified master commit, inspect current behavior with focused `rg`; write `## Wave D execution plan — MAI-113` into local root `AGENTS.md`; include outcome, evidence, slices, exclusive files, tests, rollout/rollback, risks/checkpoints, and exclusions; persist it with Backlog `planSet`; keep it uncommitted and `skip-worktree`; leave the task To Do until Luna starts.

No Sol planning exception. Return base commit, gate, worktree/branch, plan status, collision analysis, blockers, and confirmation that no implementation or Graphify ran.
