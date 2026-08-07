Context

MAI-43 is a Wave G delivery task for **Deliverables, redaction, release and exports**. Linear issue MAI-43 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable local `AGENTS.md` execution plan, and the full Linear issue before changing code.

Use `$solve-mai` as the task workflow. Begin with the repair-or-restart assessment required by the operating policy. If no implementation exists yet, execute from the maestro-created task worktree and approved Linear plan; if a partial implementation or Draft PR exists, preserve it when repair is safer than restart.

Objective

Deliver deliverable drafts and versions, stale marking, redaction, approval, release, export/distribution jobs, immutable manifests, recipient scope, and retry receipts.

Relevant scope / architecture

The Deliverables & Distribution bounded context owns draft/version lifecycle, stale state, redaction records, approval/release state, export jobs, immutable manifests, recipient scope, and retryable delivery receipts.

Release and external distribution are human-authorized side effects; generated content remains a draft until the authorized release transition.

If delegation is justified, safe slices are draft/version lifecycle, redaction/release authority, export jobs/receipts, persistence/API, and security/retry tests.

Known risks or constraints

Do not autonomously release or distribute artifacts, expose unredacted restricted fields, or certify external rendering/communication providers without evidence.

Stale source changes must invalidate affected deliverables without rewriting historical released versions. Recipient and purpose scope must be explicit and auditable.

Do not broaden into provider certification, generic notification ownership, frontend redesign, or unrelated document processing.

Expected verification

Run focused deliverable lifecycle, redaction, approval/release, stale invalidation, export/distribution job, recipient-scope, retry/idempotency, persistence, and API tests.

Before handoff, run affected PostgreSQL/security/rollback tests plus changed-file type/lint/format checks and `git diff --check`.

Run canonical `DENO_ENV=test deno task verify` once when ready and record exact evidence in Linear and the Draft PR. Do not include Graphify output in the implementation PR.

Allowed state transitions

Move Linear MAI-43 from Todo to In Progress only when implementation starts. Keep it In Progress through implementation and owner review. Create or update one Draft PR for MAI-43; do not self-approve, self-merge, mark the issue Done, perform wave closure, or change downstream issue state.

Only the authorized wave finisher may make the final Done transition after the merged-source and wave-level gates pass. Use Linear for task evidence and governed documentation.

/goal
