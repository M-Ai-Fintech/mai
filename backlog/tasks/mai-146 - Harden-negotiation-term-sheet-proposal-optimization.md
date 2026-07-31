---
id: MAI-146
title: Harden negotiation term-sheet proposal optimization
status: To Do
assignee: []
created_date: '2026-07-31 05:04'
labels:
  - backend
  - architecture
  - negotiation
  - optimization
  - calculations
  - testing
milestone: m-12
dependencies: []
priority: high
ordinal: 132000
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
