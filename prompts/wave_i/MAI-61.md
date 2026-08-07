Context

MAI-61 is the Wave I task for **Integration adapters and certification**. Linear issue MAI-61 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, `plan_MAI-61.md`, the applicable local `AGENTS.md` execution plan, and the full Linear issue before changing code.

Use `$solve-mai` as the task workflow. Begin with the repair-or-restart assessment. Execute from the maestro-created worktree and approved Linear plan, or preserve a partial implementation when repair is safer than restart.

Objective

Implement or configure approved identity, object-storage, VDR/document, AI, embedding, inference, conversion/OCR, communication, and webhook adapters with explicit capabilities, configuration, health, sandbox/failure behavior, residency/retention, secrets handling, and evidence-backed readiness certification.

Relevant scope / architecture

Provider adapters sit behind project-owned ports. Certification is environment-specific and must distinguish interface-only, fixture, sandbox, partially implemented, production-candidate, and production-verified states.

Provider lanes may run in parallel when ownership is disjoint, but one coordinator owns the readiness register, shared configuration semantics, final certification status, and integration-wide verification.

Known risks or constraints

Do not claim production verification without executed environment evidence, silently fall back to fixtures, expose secrets, or enable unapproved providers.

Keep adapter implementation separate from MAI-22 infrastructure ownership. Capability absence and dependency unavailability must fail explicitly and safely.

Do not broaden into domain authority, frontend redesign, or provider selection beyond approved Linear/architecture decisions.

Expected verification

Run provider contract, authentication/configuration, capability-denial, sandbox, failure-normalization, timeout/retry/rate-limit, secret-redaction, health, residency/retention, and consumer compatibility tests.

Record provider-by-provider evidence and explicit unavailable semantics. Run affected integration tests, changed-file type/lint/format checks, `git diff --check`, and canonical `DENO_ENV=test deno task verify` once when ready.

No required provider gate may be represented as passing when credentials, sandbox access, or environment evidence are absent. Do not include Graphify output in the implementation PR.

Allowed state transitions

Move Linear MAI-61 from Todo to In Progress only when implementation starts. Keep it In Progress and its PR Draft through owner/security review. Do not self-approve, self-merge, mark Done, perform Wave I closure, or alter downstream state.

Only the authorized Wave I finisher may make the final Done transition after merged-source verification. Use Linear for task evidence and governed documentation.

/goal
