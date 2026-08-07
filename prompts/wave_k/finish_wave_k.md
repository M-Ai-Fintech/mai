Context

The authoritative execution policy is `prompts/OPERATING_RULES.md`; read it before execution.

Wave K contains Linear issues MAI-68 and MAI-69. Run only after both owner-approved PRs are merged. Linear state, merged source, retirement inventory, and model-adaptation decision evidence are authoritative.

Objective

Close Wave K only after proving legacy banker-facing CLI replacement/retirement is safe and the Brazilian M&A model-adaptation strategy has an evidence-backed formal Go/No-go without unauthorized model training/deployment.

Relevant scope / architecture

Verify MAI-68 replacement coverage and preserved bounded operator tooling, plus MAI-69 common evaluation methodology, dataset governance, comparative evidence, limitations, rollback, and formal decision.

Parallel read-only reviewers may be used only when justified, each with a concrete `/goal`; only the finisher writes Linear closure evidence and Graphify/master metadata.

Known risks or constraints

Do not remove MAI-70 migration tooling, repair feature code, claim unsupported model adaptation, or hide evaluation/data-governance gaps.

Expected verification

Run focused CLI replacement/operations and model-evaluation/governance checks plus canonical `DENO_ENV=test deno task verify`. Reconcile ACs, merged evidence, retained tools, formal decision, and open P0/P1 findings.

If green, run one `graphify update .`, `git diff --check`, mark MAI-68/69 Done in Linear, remove only merged branches/worktrees, commit `docs: close delivery wave K`, push master, and confirm clean synchronized master. Otherwise record blockers and leave Wave K open.

Allowed state transitions

The finisher may mark MAI-68 and MAI-69 Done and push the Wave K closure commit only after every gate passes. It may not implement fixes or start MAI-70 cutover.

/goal
