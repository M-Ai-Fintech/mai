Context

The authoritative execution policy is `prompts/OPERATING_RULES.md`; read it before execution.

Wave L contains Linear issue MAI-71 — Pre-seed MVP end-to-end demo readiness gate. Run only after its owner-approved PR is merged and all current-MVP dependencies are complete. MAI-70 and other post-MVP tasks are not Wave L closure gates.

Objective

Close Wave L and the pre-seed MVP only after proving the principal investor-demo workflow is repeatable, evidence-grounded, permission-safe, human-governed, and free of unresolved P0/P1 defects at the exact merged-source SHA.

Relevant scope / architecture

Reconcile MAI-71 evidence for the supported banker-facing frontend/API path, M&Ai-managed document ingestion, exact source/version/checksum provenance, evidence/citations, findings/calculations, human-authority boundaries, safe failure behavior, deterministic demo setup/reset, and final demo artifact. Only the finisher writes Linear closure state, Graphify, and repository closure metadata.

Known risks or constraints

Do not implement features, waive P0/P1 defects, reinterpret missing required MVP evidence as pass, start post-MVP work, require live Papermark certification, require GCP, or convert this gate into production-candidate approval. MAI-70, MAI-66, MAI-67, MAI-69, MAI-81, MAI-82, and MAI-83 remain deferred.

Expected verification

Run or validate the focused MAI-71 demo E2E/integration/security checks and exact-head canonical `DENO_ENV=test deno task verify`. Confirm deterministic reset/setup, synthetic data only, supported workflow completion, provenance, isolation, authority, truthful runtime-state labeling, demo dossier, and zero open P0/P1 findings.

If green, run exactly one `graphify update .`, `git diff --check`, mark MAI-71 Done in Linear, remove only its merged branch/worktree, commit `docs: close delivery wave L`, push master, and verify clean synchronized master. Otherwise record the exact blocker and leave MAI-71 non-Done.

Allowed state transitions

The finisher may mark MAI-71 Done and push the Wave L closure commit only after every current-MVP demo-readiness gate passes. It may not start MAI-83 or any other post-MVP task.

/goal
