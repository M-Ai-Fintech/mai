Context

MAI-71 is the Wave L **Pre-seed MVP end-to-end demo readiness and integration gate**. Linear issue MAI-71 and its current owner scope override are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable local `AGENTS.md` plan, current dependency evidence, and the full Linear issue before changing code or demo-readiness artifacts.

Use `$solve-mai` as the accountable workflow. Prior MVP delivery waves are closed. MAI-71 may implement the narrow cross-context product and composition changes required to make the approved pre-seed demo workflow execute end to end; do not reopen completed tasks solely to route final integration defects.

Objective

Make the integrated M&Ai pre-seed MVP actually work end to end and prove it: deal setup, M&Ai-managed document ingestion, exact provenance, evidence-grounded diligence, findings/calculations, banker review and human authority, approved frontend/API workflows, and a repeatable investor-demo output.

Relevant scope / architecture

Exercise the supported MVP path using real application/backend contracts rather than presentation-only fixture success. The guaranteed document path is M&Ai-managed upload/local document-source ingestion. Validate exact deal/source/version/checksum references, evidence/citations, missing-document gaps where applicable, findings and financial impacts, truthful deterministic/model state labels, permission-safe protected paths, and human-only decision boundaries.

When this final integrated gate exposes a concrete MVP P0/P1 defect, MAI-71 may implement the smallest coherent fix necessary across frontend adapters, `/api/v1` routing/composition, bounded-context wiring, identity/authorization/audit adapters, persistence composition, agent/human-authority wiring, and deterministic demo infrastructure. Preserve existing domain contracts and ownership semantics; do not create permissive fakes for identity, authorization, audit, authority, provenance, or protected-data access. Use real repository-owned application/platform adapters or add the missing bounded composition where the target architecture already defines the contract.

The demo must be repeatable from documented local/containerized setup with realistic synthetic M&A data and no customer-confidential or production data. Produce a concise demo-readiness dossier with exact tested SHA, environment, supported workflow, limitations, deferred capabilities, and reset/rollback instructions.

Known risks or constraints

Do not require or retry live Papermark Data Room certification; MAI-82 owns that post-MVP work. Do not require GCP/MAI-81, MAI-70 full migration, enterprise compliance, production IdP certification, RPO/RTO, penetration testing, HA/multi-region operations, or production-candidate approval. Do not start MAI-83 or any post-MVP task.

Do not waive P0/P1 defects, present fallback/synthetic output as real provider/model execution, expose secrets or cross-scope data, or allow agents/models to perform human-only approval, release, invite, permission, signature, or equivalent irreversible actions. Do not redesign product workflows/Figma unless a current MAI-71 acceptance criterion is impossible without an explicit owner product decision.

Expected verification

For each concrete integration P0/P1, run only the affected focused tests while iterating. Validate route registration/composition, context-owned identity and authorization, audit linkage, human-authority enforcement, deterministic setup/reset, ingestion/provenance, evidence/citations, isolation/authorization-before-load, truthful runtime-state labeling, supported frontend/API paths, and safe key failure states.

After all P0/P1 findings are closed, run one fresh exact-head adversarial review of the integrated MAI-71 candidate. If P0=0 and P1=0, run one exact-head canonical `DENO_ENV=test deno task verify` and retain the full terminal result JSON and tested SHA. Record implementation evidence, demo-readiness dossier, and exact limitations in Linear and the Draft PR. Do not run Graphify in the task PR.

Allowed state transitions

Keep Linear MAI-71 In Progress while implementation and gate verification are active. MAI-71 may contain implementation changes and a Draft PR. Keep the PR Draft through owner review. Do not self-approve, self-merge, mark Done, perform Wave L closure, reopen completed tasks merely for routing, or start post-MVP work.

Only the authorized Wave L finisher may make the final Done transition and repository closure after the MAI-71 PR is owner-approved and merged.

/goal
