# MAI-16 — Immutable audit and activity foundation

**Skill:** `$solve-mai`

Read `prompts/OPERATING_RULES.md` and `## Wave A execution plan — MAI-16` in local `AGENTS.md`; never commit it. Invoke `$solve-mai MAI-16`.

## Focus

Deliver append-only audit events, authority/evidence snapshots, redaction overlays, deterministic activity projections, and export-job boundaries.

## Boundary

Do not import historical data, certify a SIEM, mutate audit history, or make redaction destructive.

Use focused`rg`, TDD/rebuild/access tests and `deno task verify`. Set In Progress, record evidence, open a PR containing MAI-16, never self-merge, and do not mark Done.
