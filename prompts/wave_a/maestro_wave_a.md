# Maestro — Wave A: Independent foundations

**Role:** create worktrees, plan, and hand off. Do not implement or merge.

Read `prompts/OPERATING_RULES.md`.

## Tasks

- `MAI-107` — Identity, institution, workspace and access lifecycle
- `MAI-108` — Organization registry
- `MAI-109` — Immutable audit and activity foundation
- `MAI-142` — ONNX financial-risk model artifact and local inference runtime
- `MAI-144` — Deterministic valuation and synergy algorithms
- `MAI-145` — Matching and portfolio-selection algorithms
- `MAI-146` — Negotiation proposal optimization
- `MAI-147` — Dispute-resolution mechanism contract
- `MAI-148` — Modular-monolith deployment and operations foundation
- `MAI-151` — Fast deterministic developer preflight

## Entry gate

All declared task dependencies must already be Done. This wave has no prior delivery-wave gate.

Run Backlog overview/execution, fetch `origin/master`, require clean synchronized master, verify every task is active To Do with `delivery-wave-a`, and rule out duplicate branches/worktrees/PRs.

| Task | Branch | Worktree | Prompt |
|---|---|---|---|
| MAI-107 | `delivery/MAI-107-identity-access-lifecycle` | `../mai-worktrees/wave_a/MAI-107` | `MAI-107.md` |
| MAI-108 | `delivery/MAI-108-organization-registry` | `../mai-worktrees/wave_a/MAI-108` | `MAI-108.md` |
| MAI-109 | `delivery/MAI-109-immutable-audit-and-activity` | `../mai-worktrees/wave_a/MAI-109` | `MAI-109.md` |
| MAI-142 | `delivery/MAI-142-onnx-artifact-and-runtime` | `../mai-worktrees/wave_a/MAI-142` | `MAI-142.md` |
| MAI-144 | `delivery/MAI-144-valuation-and-synergy-algorithms` | `../mai-worktrees/wave_a/MAI-144` | `MAI-144.md` |
| MAI-145 | `delivery/MAI-145-matching-and-portfolio-algorithms` | `../mai-worktrees/wave_a/MAI-145` | `MAI-145.md` |
| MAI-146 | `delivery/MAI-146-negotiation-proposal-optimization` | `../mai-worktrees/wave_a/MAI-146` | `MAI-146.md` |
| MAI-147 | `delivery/MAI-147-dispute-resolution-contract` | `../mai-worktrees/wave_a/MAI-147` | `MAI-147.md` |
| MAI-148 | `delivery/MAI-148-deployment-and-operations-foundation` | `../mai-worktrees/wave_a/MAI-148` | `MAI-148.md` |
| MAI-151 | `delivery/MAI-151-fast-developer-preflight` | `../mai-worktrees/wave_a/MAI-151` | `MAI-151.md` |

Create all from one verified master commit. Inspect with focused `rg`, compare planned files, and eliminate unsafe overlap. For each task write `## Wave A execution plan — <TASK-ID>` in local root `AGENTS.md`, persist with Backlog `planSet`, keep uncommitted/`skip-worktree`, and leave To Do until implementation starts.

Use `prompts/OPERATING_RULES.md` for every plan's model route; record a written deep architecture, security, or planning justification if Sol is selected. Return base, gates, matrix, plans, collision analysis, parallel launch groups, recommended merge order, blockers, and confirmation no implementation or Graphify ran.
