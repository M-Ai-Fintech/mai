Context

MAI-71 is the Wave M **End-to-end, security and operational release gate**. Linear issue MAI-71 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable local `AGENTS.md` release plan, all declared dependency evidence, and the full Linear issue before changing release-gate artifacts.

Use `$solve-mai` as the accountable release-gate workflow. Begin with the repair-or-restart assessment only for release evidence or test harness defects; MAI-71 is not a feature-implementation task.

Objective

Execute the complete end-to-end workflow, authorization/isolation, human-authority, concurrency/idempotency, jobs/recovery, audit reconstruction, provider-failure, backup/restore, frontend, security/privacy, and operational production-candidate gate and produce one evidence-backed release recommendation.

Relevant scope / architecture

MAI-71 is primarily parallel verification with one authoritative coordinator and at most one writer for release artifacts. Disjoint read-only verification streams may cover workflows, authorization/isolation, external access, human authority, concurrency/idempotency, jobs/recovery, audit reconstruction, provider failure, backup/restore, frontend workflows, and security/privacy.

The coordinator owns integration of evidence, P0/P1 disposition, exact-head verification, release dossier, and final recommendation. No verification worker owns feature code or Linear state.

Known risks or constraints

Do not implement missing features, waive P0/P1 defects, convert unavailable evidence into a pass, self-promote, deploy to production automatically, or change dependency status to force readiness.

A failed, timed-out, unavailable, skipped required, or ignored required gate is non-passing. Provider and recovery claims require executed environment evidence.

Expected verification

Execute or reconcile all critical workflow/E2E, role and cross-tenant/deal isolation, external participant, human approval, concurrency/idempotency, durable jobs/recovery, audit reconstruction, provider degradation, backup/restore, migration, frontend build/workflow, security/privacy, and operational checks.

Run exact-head canonical `DENO_ENV=test deno task verify`, confirm zero unresolved P0/P1 defects, and record commands, terminal results, environment, limitations, and release recommendation in Linear and the Draft PR. Do not run Graphify in the task PR.

Allowed state transitions

Move Linear MAI-71 from Todo to In Progress only when release-gate execution begins. Keep it In Progress and its PR Draft through owner/release review. Do not self-approve, self-merge, mark Done, deploy/promote production, or declare production-ready without owner authorization.

Only the authorized Wave M finisher may make the final Done transition and repository closure after the release-gate PR is owner-approved and merged.

/goal
