# MA&I Delivery Prompts

`prompts/OPERATING_RULES.md` is the single authoritative execution and
verification policy. Read it before any executable prompt. Linear is the
system of record for current issues, native relations, project/wave state,
acceptance evidence, and governed documentation; legacy Backlog IDs and paths
are historical traceability only.

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

Use `manifest.json` for route metadata and wave relationships. Linear issue
state and native relations remain authoritative; the migration map at
`docs/migrations/backlog-to-linear-map.json` is historical traceability only.
