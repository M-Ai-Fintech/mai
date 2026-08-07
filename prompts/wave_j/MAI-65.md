Context

MAI-65 is the Wave J task for **Governed model-backed financial-risk integration**. Linear issue MAI-65 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable local `AGENTS.md` execution plan, and the full Linear issue before changing code.

Use `$solve-mai` as the task workflow and begin with the repair-or-restart assessment.

Objective

Integrate model-backed financial-risk inference through a domain-owned application service and typed port with exact model, prompt/input, evidence, calculation, provider, and result lineage; emit proposed Findings only through governed Diligence & Decisions contracts.

Relevant scope / architecture

Model inference is analysis, not decision authority. The domain service owns authorization, input shaping, lineage, calculation records, fallback state, and conversion of validated outputs into proposed Finding inputs.

Consume provider readiness from MAI-61 and Evidence/Diligence contracts through public versioned seams. Keep model/provider implementation behind project-owned ports.

Known risks or constraints

Do not let model output create or rewrite a human decision, hide fallback/degraded state, bypass provider certification, or lose exact evidence/model lineage.

Do not broaden into provider selection, base Evidence ownership, feedback-loop implementation, or frontend redesign.

Expected verification

Run focused model-port, authorization, lineage, evidence-basis, calculation-record, proposed-Finding, provider-unavailable/fallback, malformed-output, and security tests.

Run affected integration/PostgreSQL checks, changed-file type/lint/format, `git diff --check`, and canonical `DENO_ENV=test deno task verify` once ready. Record exact model/provider/lineage evidence in Linear and the Draft PR.

Allowed state transitions

Move Linear MAI-65 from Todo to In Progress only when implementation starts. Keep it In Progress and its PR Draft through owner/security/model review. Do not self-approve, self-merge, mark Done, perform Wave J closure, or alter downstream state.

Only the authorized Wave J finisher may make the final Done transition after merged-source verification.

/goal
