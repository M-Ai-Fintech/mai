Context

MAI-68 is the Wave K task for **Retire the legacy banker-facing CLI and preserve bounded operator tooling**. Linear issue MAI-68 and its native relations are authoritative. Read `prompts/OPERATING_RULES.md`, `prompts/README.md`, the applicable local `AGENTS.md` execution plan, and the full Linear issue before changing code.

Use `$solve-mai` as the task workflow and begin with the repair-or-restart assessment.

Objective

Remove the banker-facing legacy CLI and obsolete command registrations while preserving explicitly bounded operator/admin tooling, migration evidence, and replacement workflows.

Relevant scope / architecture

Inventory CLI entry points and consumers first. A path may be removed only when its banker-facing capability has authoritative replacement coverage or is explicitly obsolete. Operator and migration tooling that remains necessary must be narrow, documented, non-banker-facing, and access controlled.

Known risks or constraints

Do not remove required operational tooling, historical evidence, migration helpers still owned by MAI-70, or frontend/backend capabilities whose replacement cutover is incomplete.

Do not turn the task into broad CLI refactoring or migration/cutover ownership.

Expected verification

Run focused CLI registration, replacement-coverage, operator-tool, command-routing, and regression tests. Search for all legacy banker-facing entry points and consumers and record each disposition.

Run changed-file type/lint/format checks, `git diff --check`, and canonical `DENO_ENV=test deno task verify` once ready. Record retirement inventory and retained operator boundaries in Linear and the Draft PR.

Allowed state transitions

Move Linear MAI-68 from Todo to In Progress only when implementation starts. Keep it In Progress and its PR Draft through owner/operations review. Do not self-approve, self-merge, mark Done, perform Wave K closure, or begin MAI-70 retirement work.

Only the authorized Wave K finisher may make the final Done transition.

/goal
