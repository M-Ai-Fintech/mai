Context

MAI-44 is a Wave G delivery task for **Pause, archive, restore, termination, retention and deletion**. Linear issue MAI-44 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable local `AGENTS.md` execution plan, and the full Linear issue before changing code.

Use `$solve-mai` as the task workflow. Begin with the repair-or-restart assessment required by the operating policy. If no implementation exists yet, execute from the maestro-created task worktree and approved Linear plan; if a partial implementation or Draft PR exists, preserve it when repair is safer than restart.

Objective

Deliver Deal Governance for pause, archive, restore and termination, consequence previews, retention/legal holds, deletion requests and approvals, resumable orchestration, and erasure manifests.

Relevant scope / architecture

The Deal Governance bounded context owns lifecycle governance, retention/legal-hold policy application, deletion-request state, approval evidence, resumable orchestration, and erasure manifests.

Physical erasure is a controlled downstream effect after policy, legal-hold, authority, dependency, and infrastructure gates; the domain must preserve history and proof of what was erased or retained.

If delegation is justified, safe slices are lifecycle governance, retention/legal hold, deletion request/approval, orchestration/manifests, and recovery/security tests. Destructive sequencing remains coordinator-owned.

Known risks or constraints

Do not physically erase data without approved policy and infrastructure, bypass legal hold, create a generic delete path, or rewrite historical evidence.

Pause/archive/restore/termination/deletion consequences must be previewable, versioned, authorized, idempotent, auditable, and recoverable where the state is reversible.

Do not broaden into MAI-70 migration ownership, provider infrastructure, frontend redesign, or unrelated deal-domain changes.

Expected verification

Run focused lifecycle, retention/legal-hold, deletion authority, consequence-preview, orchestration, recovery, erasure-manifest, idempotency, persistence, and API tests.

Before handoff, run affected PostgreSQL, rollback/recovery, security, changed-file type/lint/format checks, and `git diff --check`.

Run canonical `DENO_ENV=test deno task verify` once when ready and record exact migration/rollback evidence in Linear and the Draft PR. Do not include Graphify output in the implementation PR.

Allowed state transitions

Move Linear MAI-44 from Todo to In Progress only when implementation starts. Keep it In Progress through implementation and owner review. Create or update one Draft PR for MAI-44; do not self-approve, self-merge, mark the issue Done, perform wave closure, or change downstream issue state.

Only the authorized wave finisher may make the final Done transition after the merged-source and wave-level gates pass. Use Linear for task evidence and governed documentation.

/goal
