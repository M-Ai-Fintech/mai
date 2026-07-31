---
id: MAI-144
title: Harden deterministic valuation and synergy calculation algorithms
status: To Do
assignee: []
created_date: '2026-07-31 05:02'
updated_date: '2026-07-31 19:57'
labels:
  - backend
  - architecture
  - valuation
  - calculations
  - finance
  - optimization
  - testing
milestone: m-12
dependencies: []
priority: high
ordinal: 130000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extract, reconcile, and harden the deterministic valuation and synergy calculation logic currently mixed into generic optimization engines, agent actions, and prototype workflows.

This task owns pure mathematical calculation modules only.

It does not own:

- persistence;
- scenario aggregate lifecycle;
- approvals;
- agents;
- API controllers;
- frontend adapters;
- model inference;
- matching;
- negotiation proposal generation.

MAI-116 owns the domain workflow, scenario versions, approvals, and API integration.

DEPENDENCIES

No blocking dependency.

Record relationships:

- partially supersedes the valuation and synergy portions of MAI-27;
- becomes a dependency of MAI-116.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Current valuation and synergy calculation implementations and duplicates are inventoried before modification.
- [ ] #2 Pure calculation modules have explicit typed inputs and outputs.
- [ ] #3 Calculation code has no direct dependency on: agents; CLI interaction; HTTP requests; persistence; environment variables; mutable global state.
- [ ] #4 Currency, units, percentage representation, rounding, precision, and negative-value behavior are explicit.
- [ ] #5 Supported calculations include the presently approved deterministic valuation and synergy formulas required by MAI-116.
- [ ] #6 Calculation errors distinguish invalid input, mathematically undefined results, unsupported methods, and unavailable required data.
- [ ] #7 Golden test vectors cover representative financial cases.
- [ ] #8 Edge cases cover: zero and negative values; missing values; invalid rates; extreme but valid values; rounding boundaries; infeasible assumptions.
- [ ] #9 Results are deterministic for identical inputs.
- [ ] #10 No model, agent, or heuristic output is represented as a deterministic calculation.
- [ ] #11 Compatibility consumers are either migrated or use an explicit temporary adapter.
- [ ] #12 Performance evidence is recorded for representative calculation sizes.
- [ ] #13 Focused tests and `deno task verify` pass.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Record that MAI-144, MAI-145, MAI-146, and MAI-147 are intended to be parallel-safe when their exclusive file ownership is respected.

Legacy financial-constraint calculation boundary

1. MAI-144 must inventory deterministic financial formulas currently located in the legacy optimization constraint engine.

2. The inventory includes, where present:
   - leverage or debt-to-EBITDA calculations;
   - interest-coverage calculations;
   - valuation-floor calculations;
   - denominator and missing-data handling;
   - units, percentages, currency, rounding, and precision behavior.

3. Pure mathematical formulas may survive only as typed deterministic calculations.

4. MAI-144 does not own:
   - KYC policy;
   - sanctions policy;
   - PEP treatment;
   - eligibility decisions;
   - policy thresholds;
   - shortlist decisions;
   - proposal approval;
   - negotiation authority.

5. A threshold such as maximum leverage or minimum coverage is a versioned policy or scenario input, not an implicit global constant owned by the calculation module.

6. Zero, negative, missing, stale, or mathematically invalid denominators must return explicit typed results or errors.

7. Missing required data must not silently produce a successful or feasible result.

8. Existing formulas and tests remain migration evidence until MAI-144 establishes authoritative replacement coverage.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Every acceptance criterion is checked with evidence.
- [ ] #2 Pure valuation and synergy calculations have one authoritative implementation.
- [ ] #3 Golden vectors and edge-case tests pass.
- [ ] #4 Duplicate mathematical logic is removed or routed through explicit compatibility adapters.
- [ ] #5 MAI-116 depends on MAI-144.
- [ ] #6 No domain workflow, approval, frontend, or agent scope is implemented in this task.
- [ ] #7 Canonical repository verification passes.
<!-- DOD:END -->
