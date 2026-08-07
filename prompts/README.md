# MA&I Delivery Prompts

`prompts/OPERATING_RULES.md` is the single authoritative execution and verification
policy. Read it before any prompt. Prompt files contain task-specific context,
objective, boundaries, risks, expected verification, allowed state transitions,
and `/goal`; they do not repeat stable operating rules.

Prompt roles:

- `maestro_wave_x.md` — coordination and planning without implementation;
- `MAI-XXX.md` — accountable task implementation or correction;
- `plan_MAI-XXX.md` — deep architecture/security/planning only when explicitly
  justified;
- `finish_wave_x.md` — merged-source evidence and authorized closure.

The default is one accountable agent. Delegation is exceptional and must meet
the separability and elapsed-time test in `prompts/OPERATING_RULES.md`; justified
delegation follows `prompts/SUBAGENT_RULES.md`. No independent review swarm is a
default.

Use the prompt registry in `manifest.json` for route metadata and wave
relationships. Linear issue state and native relations remain authoritative;
the migration map is historical traceability only. This policy adaptation does
not start Wave F or perform a Wave transition.
