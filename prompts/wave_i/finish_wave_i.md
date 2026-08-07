Context

The authoritative execution policy is `prompts/OPERATING_RULES.md`; read it before execution.

Wave I contains Linear issues MAI-60 and MAI-61. Run only after both owner-approved PRs are merged. Linear issue state, merged source, provider evidence, and governed documentation are authoritative.

Objective

Close Wave I only after proving governed agent definition/tool authority and provider adapter/certification behavior are complete, explicit, secure, and evidence-backed on merged master.

Relevant scope / architecture

Verify agent definition versioning, ToolGateway permissions, prohibited effects, removal/fencing of self-learning/fake inference, and MAI-61 capability/configuration/health/failure/readiness evidence with no silent fixture fallback.

Use parallel read-only security/provider/integration reviewers only when justified and give each a concrete `/goal`. Only the finisher writes Linear closure evidence, Graphify, and master metadata.

Known risks or constraints

Do not certify providers without environment evidence, hide unavailable dependencies, repair feature code, or waive human-authority/security failures.

Expected verification

Run focused agent/security/provider/integration checks and canonical `DENO_ENV=test deno task verify`. Reconcile provider-by-provider readiness, task ACs, migration/configuration integrity, merged PR evidence, and open P0/P1 findings.

If green, run one `graphify update .`, `git diff --check`, mark MAI-60/61 Done in Linear, remove only merged branches/worktrees, commit `docs: close delivery wave I`, push master, and confirm clean synchronized master. Otherwise record blockers and leave Wave I open.

Allowed state transitions

The finisher may mark MAI-60 and MAI-61 Done and push the Wave I closure commit only after all gates pass. It may not implement provider/agent fixes or start Wave J implementation.

/goal
