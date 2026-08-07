Context

The authoritative execution policy is `prompts/OPERATING_RULES.md`; read it before execution.

Wave J contains Linear issues MAI-64, MAI-65, MAI-66, and MAI-67. Run only after all four owner-approved PRs are merged. Linear state, merged source, frontend/model/evidence artifacts, and governed documents are authoritative.

Objective

Close Wave J only after proving frontend adapter parity, governed model-backed lineage/authority, enterprise evidence integrity, and audited feedback/offline evaluation governance on merged master.

Relevant scope / architecture

Verify MAI-64 route/screen/permission/stale/error parity, MAI-65 model/evidence/calculation/proposed-Finding lineage and provider gating, MAI-66 source-backed security/privacy/compliance claims, and MAI-67 immutable feedback/dataset/evaluation/promotion behavior.

Use parallel read-only GUI/security/model/privacy reviewers only when justified; each receives a concrete `/goal`. Only the finisher writes Linear closure evidence, Graphify, and master closure metadata.

Known risks or constraints

Do not repair feature code, convert missing certification into evidence, permit runtime self-learning, hide frontend drift, or make post-MVP evidence tasks artificial MAI-71 dependencies.

Expected verification

Run focused GUI/security/model/privacy/evaluation checks and canonical `DENO_ENV=test deno task verify`. Reconcile ACs, exact merged PRs, frontend build/workflows, model/provider lineage, evidence claims, migration integrity, and open P0/P1 findings.

If green, run one `graphify update .`, `git diff --check`, mark MAI-64/65/66/67 Done in Linear, remove only merged branches/worktrees, commit `docs: close delivery wave J`, push master, and verify clean synchronized master. Otherwise record blockers and leave Wave J open.

Allowed state transitions

The finisher may mark all four Wave J issues Done and push the closure commit only after all gates pass. It may not implement fixes or start Wave K implementation.

/goal
