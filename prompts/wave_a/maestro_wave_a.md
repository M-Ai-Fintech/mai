# Maestro — Wave A: Independent foundations

**Role:** create worktrees, plan, and hand off. Do not implement or merge.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-14` — Identity, institution, workspace and access lifecycle
- `MAI-15` — Organization registry
- `MAI-16` — Immutable audit and activity foundation
- `MAI-17` — ONNX financial-risk model artifact and local inference runtime
- `MAI-18` — Deterministic valuation and synergy algorithms
- `MAI-19` — Matching and portfolio-selection algorithms
- `MAI-20` — Negotiation proposal optimization
- `MAI-21` — Dispute-resolution mechanism contract
- `MAI-22` — Modular-monolith deployment and operations foundation
- `MAI-23` — Fast deterministic developer preflight

## Entry gate

All declared task dependencies must already be Done. This wave has no prior delivery-wave gate.

Run Linear workspace and issue/project context, fetch `origin/master`, require clean synchronized master, verify every task is active To Do with `delivery-wave-a`, and rule out duplicate branches/worktrees/PRs.

| Task | Branch | Worktree | Prompt |
|---|---|---|---|
| MAI-14 | `delivery/MAI-14-identity-access-lifecycle` | `../mai-worktrees/wave_a/MAI-14` | `MAI-14.md` |
| MAI-15 | `delivery/MAI-15-organization-registry` | `../mai-worktrees/wave_a/MAI-15` | `MAI-15.md` |
| MAI-16 | `delivery/MAI-16-immutable-audit-and-activity` | `../mai-worktrees/wave_a/MAI-16` | `MAI-16.md` |
| MAI-17 | `delivery/MAI-17-onnx-artifact-and-runtime` | `../mai-worktrees/wave_a/MAI-17` | `MAI-17.md` |
| MAI-18 | `delivery/MAI-18-valuation-and-synergy-algorithms` | `../mai-worktrees/wave_a/MAI-18` | `MAI-18.md` |
| MAI-19 | `delivery/MAI-19-matching-and-portfolio-algorithms` | `../mai-worktrees/wave_a/MAI-19` | `MAI-19.md` |
| MAI-20 | `delivery/MAI-20-negotiation-proposal-optimization` | `../mai-worktrees/wave_a/MAI-20` | `MAI-20.md` |
| MAI-21 | `delivery/MAI-21-dispute-resolution-contract` | `../mai-worktrees/wave_a/MAI-21` | `MAI-21.md` |
| MAI-22 | `delivery/MAI-22-deployment-and-operations-foundation` | `../mai-worktrees/wave_a/MAI-22` | `MAI-22.md` |
| MAI-23 | `delivery/MAI-23-fast-developer-preflight` | `../mai-worktrees/wave_a/MAI-23` | `MAI-23.md` |

Create all from one verified master commit. Inspect with focused `rg`, compare planned files, and eliminate unsafe overlap. For each task write `## Wave A execution plan — <TASK-ID>` in local root `AGENTS.md`, persist with the Linear issue description or plan metadata, keep uncommitted/`skip-worktree`, and leave To Do until implementation starts.

Use `prompts/OPERATING_RULES.md` for every plan's model route; record a written deep architecture, security, or planning justification if Sol is selected. Return base, gates, matrix, plans, collision analysis, parallel launch groups, recommended merge order, blockers, and confirmation no implementation or Graphify ran.
