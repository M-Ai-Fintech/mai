# MAI-22 — Modular-monolith deployment and operations foundation

**Skill:** `$solve-mai`

Read `prompts/OPERATING_RULES.md` and `## Wave A execution plan — MAI-22` in local `AGENTS.md`; never commit it. Invoke `$solve-mai MAI-22`.

## Focus

Provision and validate packaging, configuration, persistence/object-storage boundaries, health, observability, backups/restores, rollout, rollback, and operator evidence for the modular monolith.

## Boundary

Do not certify product providers, hard-code production topology, or mix application-domain implementation into infrastructure.

Use focused`rg`, operations/recovery tests and `deno task verify`. Set In Progress, record evidence, open a PR containing MAI-22, never self-merge, and do not mark Done.
