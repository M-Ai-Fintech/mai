# MA&I Delivery Prompts

`prompts/OPERATING_RULES.md` is the single authoritative execution and
verification policy. Read it before any executable prompt. Linear is the
system of record for current issues, native relations, project/wave state,
acceptance evidence, and governed documentation; legacy Backlog IDs and paths
are historical traceability only.

## Current pre-seed MVP wave boundary

`prompts/manifest.json` lists only active pre-seed MVP delivery waves. Issues
classified `post-mvp` in Linear are intentionally excluded from active wave
folders and wave closure gates until the owner explicitly starts a later
post-demo program.

Current active future MVP waves are:

- Wave J: MAI-64, MAI-65;
- Wave K: MAI-68;
- Wave L: MAI-71, the pre-seed MVP end-to-end demo readiness gate.

MAI-70, MAI-66, MAI-67, MAI-69, MAI-81, MAI-82, MAI-83, and other Linear
issues explicitly classified post-MVP are not active MVP wave dependencies.
Their historical prompts remain available through Git history and future
post-MVP prompts may be created when those tasks are explicitly activated.

## Canonical executable prompt format

Every active executable prompt ends with exactly one terminal:

```text
/goal
```

`/goal` must be the last nonblank line. Do not place instructions, reports, or
examples after it.

Active task prompts use exactly these sections, in this order:

```text
Context
Objective
Relevant scope / architecture
Known risks or constraints
Expected verification
Allowed state transitions
/goal
```

Maestro, deep-plan, and finisher prompts use the same lean section order,
adapted to their role. They must still terminate with `/goal`.

Prompt files contain task- or wave-specific context only. Stable model routing,
Fast mode, repair/restart judgment, delegation, PostgreSQL/migration integrity,
Git/Linear lifecycle authority, and verification policy belong in
`prompts/OPERATING_RULES.md`. Justified delegation follows
`prompts/SUBAGENT_RULES.md`.

## Prompt roles

- `maestro_wave_x.md` — coordination, dependency gates, worktrees, collision
  analysis, and Linear-backed planning without implementation;
- `MAI-XXX.md` — accountable task implementation or correction through
  `$solve-mai`;
- `plan_MAI-XXX.md` — deep architecture/security/planning handoff only when
  explicitly justified;
- `finish_wave_x.md` — merged-source evidence, canonical verification,
  authorized Linear closure, and the single authorized Graphify refresh.

Historical prompts from closed waves remain delivery evidence and are not
rewritten solely for formatting. The canonical format applies to the current
and future executable surface.

Use `manifest.json` for route metadata and active MVP wave relationships.
Linear issue state and native relations remain authoritative; the migration map
at `docs/migrations/backlog-to-linear-map.json` is historical traceability only.
