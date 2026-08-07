# MAI-71 — End-to-end, security and operational release gate

**Skill:** `$solve-mai`

Read `prompts/OPERATING_RULES.md` and `## Wave M execution plan — MAI-71` in local
`AGENTS.md`; never commit it. Invoke `$solve-mai MAI-71`.

## Execution policy

Apply `prompts/OPERATING_RULES.md`. Default to one accountable agent. Delegate only when the work is genuinely separable and materially faster; if delegated, follow `prompts/SUBAGENT_RULES.md`.

## Suggested safe slice categories

- End-to-end workflows
- Authorization and tenant/Deal isolation
- External participant isolation
- Human authority
- Concurrency/idempotency
- Jobs and recovery
- Audit reconstruction
- Provider failures
- Backup/restore
- Security/privacy
- Frontend build/workflows

Set `max_writers` to one. MAI-71 is primarily parallel verification, not
parallel feature implementation.

## Focus

Execute the complete workflow, isolation, authority, concurrency, recovery,
provider-failure, backup/restore, and operational production-candidate release
gate.

## Boundary

Do not implement features, waive P0/P1 defects, self-promote, or mark
release-ready without executed evidence.

Use focusedinspection,
independent verification streams and `deno task verify`. Set In Progress, record
the full release dossier and exact failures, open a PR containing MAI-71, never
self-merge, and do not mark Done.
