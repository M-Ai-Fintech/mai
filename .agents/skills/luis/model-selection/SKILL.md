---
name: model-selection
description: >
  Route each MAI work phase to a currently available Codex or Antigravity
  model using task complexity, required capabilities, repository access, and
  live plan capacity. Use before investigation, planning, implementation,
  verification, review, or a cross-platform handoff.
---

# Model Selection

Route by fit, not vendor. Choose one exact model and the lowest sufficient
reasoning level.

Read [the routing matrix](references/routing.md) before every selection. Read
[the dated source note](references/model-catalog-sources.md) only when checking
whether the catalog, limits, or vendor claims are still current.

## Route

1. Capture the phase, requested deliverable, mutation boundary, required tools
   and modalities, relevant context size, uncertainty, and consequence of error.
2. Classify complexity:
   - **Low**: bounded, reversible, known pattern, one component, clear proof.
   - **Medium**: several files or sources, some ambiguity, integration work, or
     multiple proof steps.
   - **High**: cross-system reasoning, large or mixed context, security/data
     risk, irreversible decisions, or unresolved competing explanations.
3. Preflight the actual surfaces:
   - confirm the candidate appears in the current Codex or Antigravity selector;
   - inspect live usage or quota status when the surface exposes it;
   - record unavailable, exhausted, or unknown capacity instead of inferring it
     from the subscription name.
4. Use the matrix to shortlist exact models. Match native capabilities first,
   then complexity, plan capacity, and continuity of evidence.
5. Apply the medium-first rule:
   - low complexity starts at low reasoning;
   - medium complexity starts at medium reasoning;
   - high complexity normally starts with a stronger model at medium reasoning;
   - high reasoning is reserved for consequential ambiguity, a failed
     medium pass, or a completion gate that remains unproved.
6. Select one primary route and one fallback. A fallback must name a concrete
   trigger such as quota exhaustion, missing tools, failed verification, or a
   specific reasoning gap.
7. Keep execution on the current platform only when it ties on capability and
   capacity. Continuity is a tie-breaker, not a Codex default.
8. If the primary route changes platform, emit the handoff packet from the
   matrix. The owner controls and executes the transfer.

## Output

```text
Phase / complexity: <phase> / <low|medium|high>
Primary: <platform — exact model — reasoning level>
Why: <capability and task-fit evidence>
Capacity: <live status, or unknown and how to check>
Fallback: <exact model> when <observable trigger>
Owner action: <none, select model, check quota, or run handoff>
```

## Completion gate

- The phase and complexity are explicit.
- The primary and fallback are exact models available on their stated surface,
  or their availability is explicitly unverified.
- The rationale names task-relevant capabilities rather than vendor prestige.
- Context limits and plan quotas are not conflated.
- High reasoning, OpenAI routing, and cross-platform transfer each have a
  concrete reason.
