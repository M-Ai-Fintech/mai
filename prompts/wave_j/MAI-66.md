# MAI-66 — Enterprise security, privacy, and compliance readiness evidence

**Skill:** `$solve-mai`

Read `prompts/OPERATING_RULES.md` and `## Wave J execution plan — MAI-66` in local
`AGENTS.md`; never commit it. Invoke `$solve-mai MAI-66`.

## Execution policy

Apply `prompts/OPERATING_RULES.md`. Default to one accountable agent. Delegate only when the work is genuinely separable and materially faster; if delegated, follow `prompts/SUBAGENT_RULES.md`.

## Focus

Assemble evidence-backed enterprise security, privacy, compliance, resilience,
and operational-readiness controls and gaps as a post-MVP dossier.

## Boundary

Do not add it to the MAI-71 dependency graph or claim certifications that were
not independently obtained.

Use focusedevidence review,
validation checks and `deno task verify`. Set In Progress, record source-backed
evidence and gaps, open a PR containing MAI-66, never self-merge, and do not
mark Done.
