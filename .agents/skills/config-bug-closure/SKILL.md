---
name: config-bug-closure
description: >
  Verify that an MAI configuration or external-integration defect is closed across its source of truth,
  affected consumers, environment contract, runtime behavior, and regression evidence. Use before completing
  Gemini, database, VDR, provider, environment-variable, dependency, or deployment configuration fixes.
---

# Configuration Closure

Use after the code change exists and before the task is completed. The closure is **systemic**: prove the reported failure is fixed and that the same bad configuration cannot persist elsewhere without an explicit follow-up.

## Inputs

Collect the task ID, the reported symptom, its `file:line` or runtime evidence, the configuration key or provider involved, and the intended source of truth. If the source of truth is unknown, use `$investigate` first.

## Closure

1. **Classify the defect.** Mark it as an isolated value, a reusable configuration pattern, an environment/secret contract, a dependency-version mismatch, a provider integration, or deployment/runtime behavior. Record why; the classification determines the required checks.

   Completion: one class and the evidence that supports it are recorded.

2. **Trace the configuration path.** Identify the checked-in definition, schema or validation, loader or adapter, environment variable or secret contract, and every affected consumer. Use exact identifiers and `file:line` references; never expose secret values.

   Completion: the source-to-runtime path is traceable from the faulty value to the observed behavior.

3. **Audit the blast radius.** For a reusable pattern, inventory every applicable configuration, environment, deployment target, or consumer. Resolve each item in the current change, a linked Linear follow-up, or an explicit, evidence-based non-applicability decision. For an isolated value, state why the pattern cannot recur.

   Completion: every in-scope instance has a recorded disposition; unverified instances are blockers.

4. **Prove the environment contract.** Verify checked-in defaults and documentation; required variable names, validation, and startup failures; provider credentials and permissions without revealing values; and deployment configuration. Confirm that a missing or invalid value fails safely and observably.

   Completion: every applicable contract boundary is verified or explicitly blocked by unavailable environment access.

5. **Prove runtime behavior.** Exercise the reported failing path and the corrected path through the smallest reliable test, integration check, or deployment observation. Verify errors, logs, retries, and fallbacks when the configuration controls them.

   Completion: evidence distinguishes the original failure from the corrected behavior.

6. **Add regression evidence.** Add or update the narrowest test or executable verification that protects the source of truth and its consumer. Record the exact command and result in Linear.

   Completion: the task has reproducible regression evidence, or a linked follow-up explains why automation is impossible.

## Gate

Return this compact record:

```markdown
## Configuration Closure

- Classification: <class and reason>
- Source-to-runtime path: <identifiers and file:line evidence>
- Blast radius: <every instance and disposition>
- Environment contract: <verified checks or blocker>
- Runtime proof: <command or observation and result>
- Regression proof: <test or verification and result>
- Gate: PASS | FAIL — <reason>
```

PASS requires every applicable closure step to have evidence. A missing environment, unavailable provider, or unresolved affected instance is FAIL and remains an explicit blocker. This skill prepares evidence; it never changes task status.
