# M&Ai Delivery Wave Prompts

Prompt set for the 35 active tasks organized into Waves A–M.

Each `wave_x/` contains:

- `maestro_wave_x.md` — 5.6 Terra Medium;
- `MAI-XXX.md` — 5.6 Luna Max implementation prompt;
- optional `plan_MAI-XXX.md` — 5.6 Sol High planning-only prompt;
- `finish_wave_x.md` — 5.6 Terra Medium final review, Graphify, and Done
  transition.

Maestros plan both cross-task parallelism and within-task delegation. Luna task
runs act as task coordinators: every subagent receives `/goal`, writers use
scratch worktrees or patch-only handoffs, and each task still produces one
authoritative PR. Finishers may parallelize read-only review and verification,
but remain the only wave-closure writer.

```text
maestro
→ task plan with ownership matrix
→ Luna task coordinator
→ /goal-based read-only and writing subagents
→ serial coordinator integration
→ one task PR
→ owner merge
→ wave finisher
```

Root files:

- `OPERATING_RULES.md` — mandatory execution rules;
- `manifest.json` — machine-readable wave, task, and model index.

Read `OPERATING_RULES.md` before any prompt. Run waves in order. Dependencies
remain authoritative.
