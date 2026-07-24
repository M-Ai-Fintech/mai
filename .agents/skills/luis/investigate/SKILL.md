---
name: investigate
description: >
  Diagnose bugs in the MAI repository using Backlog task context and end-to-end code tracing.
  Identify the root cause with file:line evidence and propose a minimal fix without implementing it.
  Use for "investiga", "investigate", "root cause", "por que não funciona", or a MAI-N task
  that needs diagnosis before coding. Use caveman output by default.
---

# Investigate

Diagnose only. Do not implement unless the user separately asks for a fix.

## Inputs

1. Require a Backlog task ID such as `MAI-17`, or enough context to find it.
2. Default to the current repository, `/home/luis/mai`.
3. Ask one concise question only when the target repository or failing flow remains ambiguous.

## Workflow

1. Run `backlog instructions overview`.
2. Read the task with `backlog task view MAI-N --plain`.
3. Extract symptoms, acceptance criteria, prior attempts, dependencies, and referenced files.
4. Inspect `git status --short`, recent commits, and relevant repository instructions.
5. Trace the flow end to end:
   - entry point or UI event;
   - request, command, or event transport;
   - service and domain logic;
   - persistence or external integration;
   - response, render, or generated artifact.
6. Use `rg` to find definitions, callers, configuration, tests, and similar working paths.
7. Compare intended behavior from Backlog with actual behavior in code.
8. Test competing hypotheses with read-only checks or focused reproduction when safe.
9. Inspect local or deployed runtime logs when static analysis cannot distinguish hypotheses.
10. Stop when one explanation accounts for every reported symptom.

## Evidence standard

Report:

- root cause at `file:line`;
- complete failing flow;
- why the current behavior occurs;
- minimal proposed fix;
- likely side effects and missing test coverage;
- confidence level and remaining uncertainty.

Distinguish facts from inference. Quote exact errors without altering them.

## Output

Use caveman style unless the user requests detail:

```text
Root cause: <file:line> — <mechanism>.
Flow: <entry> → <logic> → <failure>.
Fix: <minimal change>.
Tests: <focused regression coverage>.
Confidence: <high|medium|low> — <reason>.
```

## Boundaries

- Do not edit files, create branches, commit, push, or update Backlog.
- Do not stop at the first plausible symptom.
- Do not guess external state that can be checked.
- Request approval before privileged access or potentially destructive diagnostics.
