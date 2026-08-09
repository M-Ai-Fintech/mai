Context

The authoritative execution policy is `prompts/OPERATING_RULES.md`; read it before execution.

Wave J contains Linear issues MAI-64 and MAI-65 only. Run only after both owner-approved PRs are merged. MAI-66 and MAI-67 are post-MVP and are not Wave J closure gates.

Objective

Close Wave J only after proving frontend adapter parity and governed model-backed financial-risk lineage/authority on merged master.

Relevant scope / architecture

Verify MAI-64 route/screen/permission/stale/error parity and MAI-65 model/evidence/calculation/proposal lineage, truthful runtime state, and provider gating. Use read-only reviewers only when justified; only the finisher writes Linear closure evidence, Graphify, and master closure metadata.

Known risks or constraints

Do not repair feature code, convert missing production/provider certification into evidence, hide frontend drift, or start post-MVP issues. MAI-66 and MAI-67 must remain outside the MVP dependency graph.

Expected verification

Run focused GUI/model/security checks and canonical `DENO_ENV=test deno task verify`. Reconcile acceptance criteria, exact merged PRs, frontend build/workflows, model/provider lineage, migration integrity, and open P0/P1 findings.

If green, run one `graphify update .`, `git diff --check`, mark MAI-64 and MAI-65 Done in Linear, remove only merged branches/worktrees, commit `docs: close delivery wave J`, push master, and verify clean synchronized master. Otherwise record blockers and leave Wave J open.

Allowed state transitions

The finisher may mark MAI-64 and MAI-65 Done and push the closure commit only after all MVP gates pass. It may not implement fixes or start Wave K implementation.

/goal
