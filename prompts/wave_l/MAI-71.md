Context

MAI-71 is the Wave L **Pre-seed MVP end-to-end demo readiness gate**. Linear issue MAI-71 and its current MVP scope are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable local `AGENTS.md` plan, current dependency evidence, and the full Linear issue before changing verification or demo-readiness artifacts.

Use `$solve-mai` as the accountable gate workflow. MAI-71 is verification/evidence work, not a production-readiness expansion or a general feature-implementation task.

Objective

Prove the integrated M&Ai pre-seed MVP reliably demonstrates its core value end to end: deal setup, M&Ai-managed document ingestion, exact provenance, evidence-grounded diligence, findings/calculations, banker review and human authority, approved frontend/API workflows, and a repeatable investor-demo output.

Relevant scope / architecture

Exercise the supported MVP path using real application/backend contracts rather than presentation-only fixture success. The guaranteed document path is M&Ai-managed upload/local document-source ingestion. Validate exact deal/source/version/checksum references, evidence/citations, missing-document gaps where applicable, findings and financial impacts, truthful deterministic/model state labels, permission-safe protected paths, and human-only decision boundaries.

The demo must be repeatable from documented local/containerized setup with realistic synthetic M&A data and no customer-confidential or production data. Produce a concise demo-readiness dossier with exact tested SHA, environment, supported workflow, limitations, deferred capabilities, and reset/rollback instructions.

Known risks or constraints

Do not require or retry live Papermark Data Room certification; MAI-82 owns that post-MVP work. Do not require GCP/MAI-81, MAI-70 full migration, enterprise compliance, production IdP certification, RPO/RTO, penetration testing, HA/multi-region operations, or production-candidate approval. Do not start MAI-83 or any post-MVP task.

Do not waive P0/P1 defects, present fallback/synthetic output as real provider/model execution, expose secrets or cross-scope data, or allow agents/models to perform human-only approval, release, invite, permission, signature, or equivalent irreversible actions.

Expected verification

Run focused E2E/integration/security checks for the principal investor-demo workflow, including deterministic setup/reset, ingestion/provenance, evidence/citations, isolation/authorization-before-load, human authority, truthful runtime-state labeling, supported frontend/API paths, and safe key failure states.

When P0=0 and P1=0, run one exact-head canonical `DENO_ENV=test deno task verify` and retain the full terminal result JSON and tested SHA. Record the demo-readiness dossier and exact evidence in Linear and the Draft PR. Do not run Graphify in the task PR.

Allowed state transitions

Move Linear MAI-71 from Todo to In Progress only when gate execution begins. Keep it In Progress and its PR Draft through owner review. Do not self-approve, self-merge, mark Done, perform Wave L closure, or start post-MVP work.

Only the authorized Wave L finisher may make the final Done transition and repository closure after the MAI-71 PR is owner-approved and merged.

/goal
