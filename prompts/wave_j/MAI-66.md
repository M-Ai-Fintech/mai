Context

MAI-66 is the Wave J task for **Enterprise security, privacy, compliance, resilience, and operational-readiness evidence**. Linear issue MAI-66 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable local `AGENTS.md` execution plan, governed Linear documents, and the full issue before changing repository evidence.

Use `$solve-mai` as the task workflow and begin with the repair-or-restart assessment.

Objective

Assemble a source-backed post-MVP enterprise readiness dossier covering security controls, privacy/LGPD, compliance evidence, resilience, operational readiness, known gaps, owners, and remediation boundaries.

Relevant scope / architecture

This task is evidence and governance work, not a substitute for missing implementation or third-party certification. Link every claim to implemented controls, executed verification, provider evidence, or an explicit gap.

Separate current capability, production-candidate evidence, independently certified status, and planned remediation.

Known risks or constraints

Do not claim SOC 2, ISO, provider, legal, privacy, backup/recovery, or other certification/readiness that has not been independently obtained or executed.

Do not add MAI-66 to the MAI-71 dependency graph merely to make the dossier a release blocker. Do not hide material gaps or turn evidence work into unrelated implementation.

Expected verification

Reconcile security, privacy, compliance, resilience, provider, backup/recovery, audit, and operational evidence against current source and Linear documentation. Run focused validation/documentation checks and any directly relevant security/control tests.

Run `git diff --check` and canonical `DENO_ENV=test deno task verify` once when the evidence set is ready if repository mutation requires the canonical gate. Record sources, gaps, owners, and exact verification in Linear and the Draft PR.

Allowed state transitions

Move Linear MAI-66 from Todo to In Progress only when work starts. Keep it In Progress and its PR Draft through owner/security/privacy review. Do not self-approve, self-merge, mark Done, perform Wave J closure, or modify MAI-71 dependencies without explicit owner authorization.

Only the authorized Wave J finisher may make the final Done transition.

/goal
