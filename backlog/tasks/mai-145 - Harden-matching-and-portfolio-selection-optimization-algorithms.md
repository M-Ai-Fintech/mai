---
id: MAI-145
title: Harden matching and portfolio-selection optimization algorithms
status: To Do
assignee: []
created_date: '2026-07-31 05:03'
labels:
  - backend
  - architecture
  - matching
  - optimization
  - calculations
  - testing
milestone: m-12
dependencies: []
priority: high
ordinal: 131000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extract and harden the matching and portfolio-selection algorithms currently mixed into the generic Optimization Engine and the misleading KYC/valuation namespace.

This task owns pure selection and optimization algorithms.

It does not own:

- organization or counterparty persistence;
- shortlist approval;
- conflict review;
- outreach;
- agents;
- APIs;
- frontend adapters;
- negotiation terms;
- valuation scenarios.

MAI-117 owns the matching workflow, conflicts, shortlist lifecycle, and business API.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Current portfolio-selection, matching, eligibility, and constraint logic is inventoried.
- [ ] #2 The authoritative implementation is located under a matching-owned namespace rather than KYC or valuation.
- [ ] #3 Inputs and outputs use explicit typed contracts.
- [ ] #4 Supported constraints include, where approved: budget limits; sector allocation; eligibility; risk thresholds; tax-debt limits; mutual exclusions; mandatory inclusions; maximum or minimum selection sizes.
- [ ] #5 Infeasible results are explicit and explain which constraints prevented a valid solution.
- [ ] #6 Result ordering and tie-breaking are deterministic.
- [ ] #7 Identical inputs produce identical results.
- [ ] #8 No hidden random behavior affects authoritative results.
- [ ] #9 Constraint explanations do not leak restricted counterparty information.
- [ ] #10 Unit and golden-vector tests cover: feasible solutions; infeasible solutions; conflicting constraints; exclusions; caps; thresholds; empty candidate sets; deterministic tie-breaking.
- [ ] #11 Existing consumers are migrated or routed through explicit compatibility adapters.
- [ ] #12 Performance evidence is recorded for representative portfolio sizes.
- [ ] #13 Focused tests and `deno task verify` pass.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Every acceptance criterion is checked with evidence.
- [ ] #2 One authoritative matching and portfolio-selection implementation exists.
- [ ] #3 The misleading KYC/valuation ownership is removed or isolated behind a compatibility adapter.
- [ ] #4 Deterministic and infeasible-result tests pass.
- [ ] #5 MAI-117 depends on MAI-145.
- [ ] #6 No shortlist approval, outreach, persistence, frontend, or agent workflow is implemented here.
- [ ] #7 Canonical repository verification passes.
<!-- DOD:END -->
