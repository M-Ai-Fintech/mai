# Investigation

Use this phase when the symptom, ownership, root cause, or minimal safe solution remains uncertain after discovery.

## Workflow

1. Invoke `$model-selection` for investigation.
2. Invoke `$investigate` with the task ID, reported symptom, and known evidence.
3. Trace the failing flow end to end:
   - entry point or user action;
   - request, command, or event transport;
   - service and domain logic;
   - persistence, model, or external provider;
   - response, render, generated artifact, or side effect.
4. Compare against:
   - the task's expected behavior;
   - tests that encode the intended contract;
   - a similar working path;
   - configuration and environment contracts.
5. Form multiple plausible hypotheses when evidence permits. Test the cheapest discriminating hypothesis first.
6. Use read-only diagnostics and focused reproduction where safe. Quote exact errors and preserve timestamps, identifiers, and commands.
7. Inspect runtime logs or provider state only when static analysis cannot distinguish causes. Request approval before privileged access.
8. Classify the implementation path:
   - runtime code;
   - configuration or environment contract;
   - provider or VDR integration;
   - data repair or one-off script;
   - documentation or process;
   - duplicate or already resolved;
   - blocked dependency.
9. For configuration, Gemini, database, VDR, provider, dependency, or deployment defects, schedule `$config-bug-closure` as a verification gate.
10. Select one minimal solution and list rejected hypotheses with evidence.

## Backlog record

The `$investigate` skill diagnoses without changing Backlog. The Solve MAI caller records durable findings through `task_edit`:

- `notesAppend`: root cause, failing flow, rejected hypotheses, and reproduction evidence;
- `planSet`: a materially changed implementation plan, after owner approval;
- `commentsAppend`: an unresolved decision requiring owner input.

Do not check acceptance criteria during diagnosis.

## Completion gate

Investigation is complete only when:

- one explanation accounts for every reported symptom;
- the root cause has `file:line` or equivalent runtime evidence;
- the chosen fix is narrower than rejected alternatives;
- regression coverage is identified;
- remaining uncertainty and environment limitations are explicit;
- Backlog contains the findings needed for handoff.

If no explanation meets this standard, stop and report the blocker instead of implementing a guess.
