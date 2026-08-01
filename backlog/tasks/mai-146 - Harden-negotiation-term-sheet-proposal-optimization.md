---
id: MAI-146
title: Harden negotiation term-sheet proposal optimization
status: In Progress
assignee: []
created_date: '2026-07-31 05:04'
updated_date: '2026-08-01 14:25'
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
references:
  - 'https://github.com/luisfelipeluis49/mai/pull/37'
modified_files:
  - src/engines/optimization/genetic.ts
  - src/engines/optimization/genetic.test.ts
  - src/engines/optimization/negotiation/constraints.ts
  - src/engines/optimization/negotiation/index.ts
  - src/engines/optimization/negotiation/optimizer.test.ts
  - src/engines/optimization/negotiation/optimizer.ts
  - src/engines/optimization/negotiation/random.ts
  - src/engines/optimization/negotiation/types.ts
  - src/engines/optimization/negotiation/utility.ts
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
1. Inventory and preserve the legacy genetic, matching, constraint, agent, API, and CLI boundaries; do not modify matching selection/valuation or read-only shared consumers.
2. Add negotiation-owned typed contracts for proposal dimensions, versioned bounds and constraint metadata, buyer/seller utility definitions with normalized units, reservation floors, seeded replay metadata, and termination limits.
3. Implement a pure seeded negotiation optimizer with explicit crossoverRate, bounded proposals, all-violation explanations, ranked alternatives, infeasibility reporting, and convergence termination.
4. Route legacy genetic optimizeDeal calls through an explicit compatibility adapter while preserving existing helper exports and consumer signatures.
5. Add golden, determinism/replay, convergence, boundary, infeasibility, compatibility, and benchmark tests; run focused checks and deno task verify.
6. Record exact evidence in Backlog, commit task-scoped changes, push the isolated branch, and open a human-reviewable PR; keep MAI-146 In Progress and do not merge or mark Done.
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

Discovery fallback: Graphify was explicitly disabled by prompts/wave_a/MAI-146.md; focused rg and source/test inspection scoped the implementation. Remote Backlog refresh and GitHub API checks hit the worktree FETCH_HEAD read-only/network limitation; local task reads and edits work. Branch: delivery/MAI-146-negotiation-proposal-optimization.

Ownership handoff: src/engines/optimization/index.ts:41 optimizeWithConstraints, src/api/routes/legacy.ts:171, and src/cli/term-sheet-command.ts:69 remain read-only legacy consumers by the MAI-146 parallel contract. Proposed coordinator migration contract: import optimizeNegotiationProposal from src/engines/optimization/negotiation/index.ts with NegotiationOptimizerInput and consume NegotiationOptimizerResult.alternatives/violations; preserve route-specific DTOs and do not add approval/send/finalization behavior. src/agent/tools/core_tools.ts:171 is routed through genetic.ts optimizeDeal compatibility without editing the read-only agent surface.

Verification evidence: targeted command DENO_ENV=test deno test --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net src/engines/optimization tests/engines/optimization.spec.ts passed 32 tests. deno fmt --check src/engines/optimization/genetic.ts src/engines/optimization/negotiation passed; deno check src/engines/optimization/negotiation/index.ts src/engines/optimization/genetic.ts passed; git diff --check passed. Benchmark bench/ga-convergence.json recorded optimizeDeal with populationSize 100 and generations 10 at 23.055440000000004ms on the reference runner. deno task verify passed canonical docs, i18n, Deno tests, token/component/shell/screen/conformance boundaries; it remains non-passing because frontend-foundation cannot spawn git (EPERM in the sandbox), and the GUI Next build was still running without output when the second retry was interrupted. GUI dependencies were installed into ignored gui/node_modules (555 packages; npm reported 7 audit vulnerabilities).

PR handoff: commit bb0b124 pushed to delivery/MAI-146-negotiation-proposal-optimization; draft PR #37 opened at https://github.com/luisfelipeluis49/mai/pull/37 against master. Human review, environment-limited frontend verification, and read-only consumer migration remain pending. Per prompt, MAI-146 stays In Progress and is not marked Done.

Handoff correction: cda63a2 chore(MAI-146): record draft PR handoff was subsequently pushed to PR #37; the remote head is cda63a2710325ea15c683e5e224f842300d35ca3.
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
