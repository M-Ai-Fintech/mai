---
id: MAI-146
title: Harden negotiation term-sheet proposal optimization
status: To Do
assignee: []
created_date: '2026-07-31 05:04'
updated_date: '2026-08-01 11:14'
labels:
  - backend
  - architecture
  - negotiation
  - optimization
  - calculations
  - testing
  - delivery-wave-a
milestone: m-12
dependencies: []
priority: high
ordinal: 10600
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extract and harden the term-sheet proposal optimizer currently located under the matching namespace and governed by the mixed-scope MAI-27 task.

This task owns deterministic or explicitly seeded proposal optimization only.

It does not own:

- sending a proposal;
- accepting a proposal;
- negotiation authority;
- approval;
- external communication;
- persistence;
- APIs;
- agents;
- frontend workflows.

MAI-118 owns negotiation lifecycle, versions, authority, approvals, and workflow integration.

DEPENDENCIES

No blocking dependency.

Record relationships:

- partially supersedes the negotiation portions of MAI-27;
- becomes a dependency of MAI-118.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The optimizer is moved to or represented by a negotiation-owned namespace.
- [ ] #2 Inputs and outputs use explicit typed contracts.
- [ ] #3 Buyer and seller utility functions and their units are documented.
- [ ] #4 Reservation utility constraints are enforced.
- [ ] #5 Cash, equity, earn-out, timing, and non-compete dimensions are bounded by explicit contracts.
- [ ] #6 Randomness is either removed or injected through a deterministic seeded random source.
- [ ] #7 Identical inputs and seed produce identical results.
- [ ] #8 The existing `crossoverRate` contract is either implemented and tested or removed through a versioned compatibility decision.
- [ ] #9 Convergence and termination behavior is explicit.
- [ ] #10 Results include sufficient explanation to show:

    - objective;
    - constraints;
    - buyer utility;
    - seller utility;
    - fitness or selection basis;
    - seed or deterministic execution identity.
- [ ] #11 The optimizer cannot send, approve, accept, or finalize terms.
- [ ] #12 Tests cover:

    - valid proposals;
    - infeasible reservation thresholds;
    - boundary values;
    - deterministic seed replay;
    - convergence termination;
    - invalid inputs;
    - no-authority behavior.
- [ ] #13 Existing consumers are migrated or routed through explicit compatibility adapters.
- [ ] #14 Representative benchmark evidence is recorded.
- [ ] #15 Focused tests and `deno task verify` pass.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory optimizer, schemas, and tests; isolate from proposal lifecycle and send/release routes.
2. Define typed constraints/utilities, reservation bounds, seed/replay metadata, convergence, alternatives, and explanations.
3. Harden pure deterministic/seeded optimization without workflow, KYC, approval, acceptance, communication, or finalization.
4. Add golden, replay, convergence, boundary, and infeasibility tests; run focused checks and deno task verify.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Legacy proposal-constraint migration boundary

1. MAI-146 must inventory the proposal-generation and proposal-filtering logic currently spread across:
   - genetic.ts;
   - constraints.ts;
   - optimization/index.ts;
   - term_sheet_optimizer.ts;
   - direct agent or tool consumers;
   - related tests and benchmarks.

2. Proposal-feasibility constraints must be explicit and versioned.

3. Each constraint records, where applicable:
   - source;
   - policy or mandate version;
   - units;
   - currency;
   - percentage representation;
   - effective date;
   - evidence or calculation version;
   - whether the constraint is mandatory or advisory.

4. Supported proposal constraints may include approved:
   - valuation ranges or floors;
   - buyer and seller reservation utilities;
   - leverage ceilings;
   - interest-coverage floors;
   - cash, equity, earn-out, escrow, timing, and non-compete bounds;
   - mandatory or prohibited structures.

5. Zero and negative denominators have explicit typed semantics.

6. Missing required inputs must not silently pass as feasible.

7. The result can report all material violated constraints rather than only removing a candidate through a silent boolean filter.

8. No KYC, sanctions, PEP, legal, compliance, shortlist, approval, or sending policy is implemented inside the proposal optimizer.

9. Random behavior is removed or supplied through an explicit seeded source.

10. Identical inputs and seed produce identical results.

11. The optimizer cannot:
    - approve;
    - accept;
    - send;
    - release;
    - finalize;
    - create an authoritative negotiation decision.

12. Existing genetic and constraint code remains migration evidence until MAI-146 establishes replacement coverage.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Every acceptance criterion is checked with evidence.
- [ ] #2 One authoritative negotiation proposal optimizer exists.
- [ ] #3 Reproducibility is demonstrated.
- [ ] #4 Unused or misleading configuration fields are resolved.
- [ ] #5 MAI-118 depends on MAI-146.
- [ ] #6 The optimizer has no ability to approve, send, or accept negotiation terms.
- [ ] #7 Canonical repository verification passes.
<!-- DOD:END -->
