---
id: MAI-146
title: Harden negotiation term-sheet proposal optimization
status: Done
assignee: []
created_date: '2026-07-31 05:04'
updated_date: '2026-08-02 05:38'
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
  - src/engines/optimization/constraints.ts
  - src/engines/optimization/constraints_test.ts
  - src/engines/optimization/index.ts
  - src/engines/optimization/types.ts
  - src/engines/optimization/matching/term_sheet_optimizer.ts
  - src/engines/optimization/negotiation/compatibility.ts
  - src/engines/optimization/negotiation/compatibility.test.ts
  - src/engines/optimization/negotiation/term_sheet_compatibility.ts
  - src/engines/optimization/negotiation/constraints.ts
  - src/engines/optimization/negotiation/index.ts
  - src/engines/optimization/negotiation/optimizer.ts
  - src/engines/optimization/negotiation/optimizer.test.ts
  - src/engines/optimization/negotiation/random.ts
  - src/engines/optimization/negotiation/types.ts
  - src/engines/optimization/negotiation/utility.ts
  - src/api/routes/legacy.ts
  - src/cli/term-sheet-command.ts
  - src/cli/document-command.ts
  - src/agent/tools/core_tools.ts
  - tests/api/routes/legacy_compatibility.spec.ts
  - tests/engines/compatibility_consumers.spec.ts
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
- [x] #1 The optimizer is moved to or represented by a negotiation-owned namespace.
- [x] #2 Inputs and outputs use explicit typed contracts.
- [x] #3 Buyer and seller utility functions and their units are documented.
- [x] #4 Reservation utility constraints are enforced.
- [x] #5 Cash, equity, earn-out, timing, and non-compete dimensions are bounded by explicit contracts.
- [x] #6 Randomness is either removed or injected through a deterministic seeded random source.
- [x] #7 Identical inputs and seed produce identical results.
- [x] #8 The existing `crossoverRate` contract is either implemented and tested or removed through a versioned compatibility decision.
- [x] #9 Convergence and termination behavior is explicit.
- [x] #10 Results include sufficient explanation to show:

    - objective;
    - constraints;
    - buyer utility;
    - seller utility;
    - fitness or selection basis;
    - seed or deterministic execution identity.
- [x] #11 The optimizer cannot send, approve, accept, or finalize terms.
- [x] #12 Tests cover:

    - valid proposals;
    - infeasible reservation thresholds;
    - boundary values;
    - deterministic seed replay;
    - convergence termination;
    - invalid inputs;
    - no-authority behavior.
- [x] #13 Existing consumers are migrated or routed through explicit compatibility adapters.
- [x] #14 Representative benchmark evidence is recorded.
- [x] #15 Focused tests and `deno task verify` pass.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory all active negotiation proposal consumers, including legacy API/CLI routes, document term-sheet generation, genetic compatibility, matching exports, tests, and direct optimizer calls; keep Graphify deferred until finalization.
2. Add one explicit negotiation-owned compatibility adapter that converts legacy DTOs/defaults into versioned typed optimizer inputs and maps results back without duplicating optimization logic.
3. Route legacy API, term-sheet CLI, document CLI, and genetic/matching compatibility surfaces through the same negotiation-owned adapter; preserve seeded replay, bounded allocations, constraints, violations, and no-authority behavior.
4. Add regression tests proving consumer delegation, no active generic optimizer path, deterministic seeded results, missing-data incompatibility, tight bounds, and prohibition of approval/send/finalization.
5. Run focused checks and the required fast/canonical gates; record exact command statuses and keep unsupported environment evidence explicit.
6. Reconcile MAI-146 through Backlog, check only proven criteria/DoD items, and finalize status from direct evidence on the current master maintenance operation.
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

Correction (2026-08-01): sampleAllocation now reserves later minimums in the current maximum (remaining minus laterMinimumSum) for initial and resampled allocations, and throws an explicit invalid allocation-bounds error when computed minimum exceeds maximum. Added an exact-minimum tight-bound regression and multi-seed property-style bound, sum, and replay coverage with mutationRate=1. Focused command DENO_ENV=test deno test --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net src/engines/optimization tests/engines/optimization.spec.ts passed 34 tests; targeted type, format, and diff checks passed. Legacy adapter fixed bounds, weights, directions, and 0.2 reservation floors remain named compatibility defaults with metadata explicitly stating they are not authoritative mandate policy; negotiation-owned inputs remain mandate authority. Task remains In Progress pending canonical gate and human review.

Canonical gate rerun for the correction: deno task verify reached all listed backend and intermediate frontend boundaries, then reported spawnSync git EPERM in gui/scripts/verify-frontend-foundation.mjs; the subsequent Next.js production build produced no output and was interrupted with exit 130. This is the existing sandbox/GUI environment limitation, not an optimization test failure.

Published correction commit 3a8f650 after rebasing onto remote merge 096d16e; pushed successfully to delivery/MAI-146-negotiation-proposal-optimization. PR #37 now reports head 3a8f650, open, unmerged, and Draft; task remains In Progress.

The subsequent Backlog-only handoff commit is included in PR #37; the PR remains open, unmerged, and Draft, with no owner approval or merge performed.

Wave A closure audit 2026-08-02: owner-approved PR #37 is merged on master at e7730d22, and the final DENO_ENV=test deno task verify completed with exit 0 and all 17 verification categories PASS. The verified criteria cover the negotiation-owned typed optimizer, utility/reservation contracts, bounded proposal dimensions, seeded replay, crossover behavior, convergence/termination, explanations, no-authority boundary, focused tests, and benchmark evidence. AC #13 and DoD #1/#2 remain intentionally unchecked because src/api/routes/legacy.ts and src/cli/term-sheet-command.ts still invoke the legacy optimizeWithConstraints path rather than an explicit negotiation compatibility adapter. The task remains In Progress; no feature implementation was changed during closure.

2026-08-02 direct-master closure: added the explicit negotiation-owned compatibility boundary under src/engines/optimization/. Legacy API and term-sheet CLI consumers now delegate through optimizeLegacyNegotiation; document generation and the retained matching facade delegate through the same typed seeded optimizer via term_sheet_compatibility.ts; genetic.ts and the agent tool are compatibility facades rather than algorithm owners. Legacy DTO/command outputs remain supported, compatibility defaults are labeled non-authoritative, bounds/reservations/violations/replay metadata are preserved, missing financial data is unavailable rather than feasible, and no approval/send/accept/finalize/persistence capability exists. Generic optimizeWithConstraints remains only as MAI-129 migration evidence and has no active negotiation consumer.

Verification evidence: DENO_ENV=test deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net src/engines/optimization/negotiation src/engines/optimization/valuation src/engines/optimization/constraints_test.ts src/engines/optimization/genetic.test.ts tests/api/routes/legacy_compatibility.spec.ts tests/engines/compatibility_consumers.spec.ts tests/engines/optimization.spec.ts exited 0 with 47 passed and 0 failed. The exact required focused command exited 0 with 28 passed and 0 failed. Changed-file deno fmt --check and deno lint each exited 0; git diff --check exited 0; deno task verify:fast exited 0; the final escalated DENO_ENV=test deno task verify exited 0 with all 17 categories PASS. AC #13 and DoD #1 and #2 are now supported; no negotiation authority, API lifecycle, persistence, frontend, or external communication scope was added.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the MAI-146 negotiation compatibility migration. API, CLI, document, genetic, matching, and agent consumers now delegate through the negotiation-owned seeded optimizer; defaults are non-authoritative, constraints are explicit, and canonical verification passed with exit 0.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Every acceptance criterion is checked with evidence.
- [x] #2 One authoritative negotiation proposal optimizer exists.
- [x] #3 Reproducibility is demonstrated.
- [x] #4 Unused or misleading configuration fields are resolved.
- [x] #5 MAI-118 depends on MAI-146.
- [x] #6 The optimizer has no ability to approve, send, or accept negotiation terms.
- [x] #7 Canonical repository verification passes.
<!-- DOD:END -->
