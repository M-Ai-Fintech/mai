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

## Escalate hard bugs

`$investigate` is the default investigation path inside `$solve-mai`. After
intake, invoke `$diagnosing-bugs` when a tight reproduction loop is necessary
to distinguish causes, including when the defect is:

- intermittent, timing-sensitive, or environment-dependent;
- a performance regression;
- spread across asynchronous, multi-service, provider, or persistence
  boundaries;
- supported by several plausible causes that static tracing cannot separate; or
- not yet backed by a deterministic, red-capable check for the reported
  symptom.

Invoke it **before forming a root-cause theory or doing broad code tracing**.
Use its diagnostic discipline: build and tighten a feedback loop, reproduce
and minimise, rank falsifiable hypotheses, and use probes that distinguish
them. Carry its reproduction command, observed output, and rejected
hypotheses into this investigation's evidence.

This is a diagnostic sub-invocation only. `$investigate` retains its
diagnose-only boundary: do not perform `$diagnosing-bugs` Phases 5–6 (fix,
regression-test implementation, or cleanup). Instead, report the identified
regression seam and hand the implementation path back to `$solve-mai`.

If `$diagnosing-bugs` cannot establish a red-capable loop, stop and report what
was tried plus the needed artifact, access, or instrumentation permission. Do
not replace that evidence with a static-analysis guess.

## Inputs

1. Require a Backlog task ID such as `MAI-17`, or enough context to find it.
2. Default to the current repository, `/home/luis/mai`.
3. Ask one concise question only when the target repository or failing flow remains ambiguous.

## Workflow

1. Run `backlog instructions overview`.
2. Read the task with `backlog task view MAI-N --plain`.
3. Extract symptoms, acceptance criteria, prior attempts, dependencies, and referenced files.
4. Inspect `git status --short`, recent commits, and relevant repository instructions.
5. Decide whether the defect meets **Escalate hard bugs**. If it does, invoke
   `$diagnosing-bugs` and complete its diagnostic sub-invocation before
   proceeding.
6. Trace the flow end to end:
   - entry point or UI event;
   - request, command, or event transport;
   - service and domain logic;
   - persistence or external integration;
   - response, render, or generated artifact.
7. Use `rg` to find definitions, callers, configuration, tests, and similar working paths.
8. Compare intended behavior from Backlog with actual behavior in code.
9. Test competing hypotheses with read-only checks or focused reproduction when safe.
10. Inspect local or deployed runtime logs when static analysis cannot distinguish hypotheses.
11. Stop when one explanation accounts for every reported symptom.

## Evidence standard

Report:

- root cause at `file:line`;
- complete failing flow;
- why the current behavior occurs;
- minimal proposed fix;
- likely side effects and missing test coverage;
- confidence level and remaining uncertainty.

For escalated hard bugs, also report the executed red-capable command and its
result, or explicitly state why no such loop could be built.

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
