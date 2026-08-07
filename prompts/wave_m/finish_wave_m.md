Context

Wave M contains Linear issue MAI-71 — End-to-end, security and operational release gate. Run only after its owner-approved release-gate PR is merged and every declared dependency is Done. Linear state, exact-head verification, release dossier, merged source, and executed environment evidence are authoritative.

Objective

Perform final repository closure and issue completion only if the complete release dossier proves workflow, isolation, authority, concurrency, recovery, provider-failure, backup/restore, migration, frontend, security/privacy, and operational gates with zero unresolved P0/P1 defects.

Relevant scope / architecture

Reconcile all MAI-71 verification streams on exact current master. Parallel read-only verification may be used when separable and materially faster, each with a concrete `/goal`; one finisher owns evidence integration, Linear state, Graphify, closure commit, and the final production-candidate recommendation.

Known risks or constraints

Do not implement features, waive P0/P1 defects, reinterpret missing/failed/timeout/ignored required evidence as pass, automatically deploy/promote production, or mark release-ready without executed proof and owner authority.

Expected verification

Run or validate all critical MAI-71 streams and exact-head canonical `DENO_ENV=test deno task verify`. Confirm dependency state, migration/cutover completion, provider/readiness evidence, backup/restore proof, frontend workflows, audit reconstruction, security/privacy evidence, and zero open P0/P1 defects.

If green, run exactly one `graphify update .`, `git diff --check`, mark MAI-71 Done in Linear, remove only its merged branch/worktree, commit `docs: close delivery wave M`, push master, verify clean synchronized master, and return the evidence-backed production-candidate decision. On failure, record the blocker and leave MAI-71 non-Done.

Allowed state transitions

The finisher may mark MAI-71 Done and push the final Wave M closure commit only after every release gate passes. Production deployment or promotion remains a separate owner-authorized action.

/goal
