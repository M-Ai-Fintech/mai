---
name: config-bug-closure
description: >
  Verify an MAI configuration or external-integration defect is fully closed across source, environment contract, runtime behavior, and regression coverage. Use for Gemini, database, VDR, environment-variable, provider, or deployment configuration failures before task completion.
---

# Configuration Closure

Use after the fix exists and before completion.

1. Classify the failure: source configuration, secret/environment contract, dependency version, provider integration, or deployment/runtime.
2. Prove the observed failing path and the corrected path with exact configuration names and `file:line` evidence.
3. Verify four layers: checked-in defaults; secret contract and validation; runtime/provider behavior; regression test or executable verification.
4. Record unresolved environment-dependent checks as explicit blockers, never as a pass.

Return a compact PASS or FAIL with evidence for every applicable layer. A PASS requires all applicable layers verified. This skill does not change task status.
