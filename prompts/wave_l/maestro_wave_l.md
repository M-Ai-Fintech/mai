Context

The authoritative execution policy is `prompts/OPERATING_RULES.md`; read it before execution.

Wave L contains Linear issue MAI-71 — Pre-seed MVP end-to-end demo readiness gate. MAI-70 is post-MVP and must not be planned or executed in this wave. Linear native relations and `prompts/manifest.json` are authoritative. Read the operating policy, README, the full MAI-71 issue, current MVP scope notes, and dependency evidence before planning.

Objective

Prepare the final pre-seed MVP demo-readiness worktree and verification plan without implementing features or expanding into production-readiness work.

Relevant scope / architecture

Create `delivery/MAI-71-pre-seed-mvp-demo-readiness-gate` at `../mai-worktrees/wave_l/MAI-71` from synchronized master. Plan the principal investor-demo path: deal setup, M&Ai-managed document ingestion, evidence/provenance, findings/calculations, banker review/human authority, approved frontend/API workflows, deterministic reset/setup, and final demo artifact.

MAI-71 is primarily verification and evidence integration. Set one accountable coordinator and at most one writer for release artifacts. Read-only verification streams may be used only when separable and materially faster. Persist `## Wave L execution plan — MAI-71` in Linear and local `AGENTS.md` according to repository convention.

Known risks or constraints

Do not implement missing product features during planning, set MAI-71 In Progress, open its PR, merge, run Graphify, waive P0/P1 defects, or treat deferred production capabilities as MVP blockers. Do not start MAI-70, MAI-81, MAI-82, MAI-83, or other post-MVP work.

Expected verification

Confirm Wave K closed, every current-MVP MAI-71 dependency Done, clean synchronized master, MAI-71 Todo, no duplicate branch/worktree/PR, exact base SHA, deterministic demo data/reset prerequisites, verification ownership, P0/P1 disposition rules, and no implementation changes.

Allowed state transitions

Planning only. Leave MAI-71 Todo and all post-MVP issues unchanged.

/goal
