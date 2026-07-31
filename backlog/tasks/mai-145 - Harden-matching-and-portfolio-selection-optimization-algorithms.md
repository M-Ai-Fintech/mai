---
id: MAI-145
title: Harden matching and portfolio-selection optimization algorithms
status: To Do
assignee: []
created_date: '2026-07-31 05:03'
updated_date: '2026-07-31 21:16'
labels:
  - backend
  - architecture
  - matching
  - optimization
  - calculations
  - testing
  - delivery-wave-a
milestone: m-12
dependencies: []
priority: high
ordinal: 10500
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Legacy KYC and restriction-input boundary

1. MAI-145 may consume eligibility and restriction inputs only through explicit, versioned domain contracts.

2. Eligibility and restriction inputs must reference the exact supporting:
   - evidence versions;
   - Finding;
   - Decision Record;
   - policy version;
   - actor or approval authority;
   - effective date;
   - staleness state.

3. A PEP indicator is not automatically equivalent to rejection.

4. Sanctions, PEP exposure, KYC status, and other restrictions follow the approved policy and decision records owned by the applicable upstream contexts.

5. MAI-145 must not recreate KYC, sanctions, legal, or compliance policy inside the matching algorithm.

6. Missing, stale, unauthorized, or unresolved restriction evidence produces an explicit unavailable, unresolved, restricted, or infeasible result.

7. Missing restriction information must not silently pass as eligible.

8. Infeasible results explain the applicable constraint without exposing protected counterparty data.

9. Result ordering and tie-breaking remain deterministic.

10. The legacy KYC booleans and generic constraint-filter implementation remain migration evidence only.
<!-- SECTION:NOTES:END -->

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
