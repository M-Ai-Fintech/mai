---
id: MAI-145
title: Harden matching and portfolio-selection optimization algorithms
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-31 05:03'
updated_date: '2026-08-02 01:39'
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
modified_files:
  - src/engines/optimization/matching/types.ts
  - src/engines/optimization/matching/portfolio_selection.ts
  - src/engines/optimization/matching/selection_input_validation.ts
  - src/engines/optimization/matching/selection_constraints.ts
  - src/engines/optimization/matching/portfolio_model.ts
  - src/engines/optimization/matching/legacy_portfolio_adapter.ts
  - src/engines/optimization/matching/index.ts
  - src/engines/optimization/kyc/kyc_valuation_solver.ts
  - tests/engines/matching.spec.ts
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the legacy KYC portfolio solver, matching boundary, consumers, and relevant architecture; preserve shared/API/CLI/agent/valuation paths as read-only.
2. Add versioned typed matching contracts for candidates, upstream eligibility evidence, exclusions, mandatory inclusions, seeded ranking, explanations, and explicit infeasibility results.
3. Implement deterministic matching-owned portfolio selection with budget, sector, risk, tax-debt, eligibility, exclusion, mandatory-inclusion, and min/max-size constraints; keep KYC policy, shortlist/outreach, persistence, and protected data outside the engine.
4. Replace the KYC implementation with an explicit compatibility adapter that preserves existing legacy result shapes without making it authoritative.
5. Add focused golden-vector, constraint, privacy, deterministic replay/property, and representative-size performance tests; run focused checks, formatting, and deno task verify.
6. Commit task-scoped changes, open a human-review PR, record evidence, and keep MAI-145 In Progress pending review and checks.
<!-- SECTION:PLAN:END -->

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

Intake/discovery: isolated clean branch delivery/MAI-145-matching-and-portfolio-algorithms; no local duplicate branch or MAI-145 commit found. Backlog remote duplicate search and GitHub PR lookup were unavailable because the worktree cannot write .git/worktrees/MAI-145/FETCH_HEAD and api.github.com is unreachable. Existing authoritative portfolio logic is src/engines/optimization/kyc/kyc_valuation_solver.ts; existing consumers are CLI, legacy API, agent tool, and tests. Matching and portfolio-specific writes are confined to src/engines/optimization/matching/**, the KYC adapter path, and a new tests/engines/matching.spec.ts. Graphify was explicitly prohibited by the prompt, so discovery used focused rg/source/docs evidence.,

Implementation slice: added matching-owned versioned contracts in src/engines/optimization/matching/types.ts; deterministic portfolio selection in portfolio_selection.ts with eligibility evidence freshness, risk, budget, tax-debt, sector caps, exclusions, mandatory inclusions, min/max sizes, stable or seeded tie ordering, privacy-safe infeasibility explanations, and no random calls; added LegacyPortfolioSolver adapter in matching/legacy_portfolio_adapter.ts and reduced KYC path to a re-export compatibility boundary. Focused evidence: deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net tests/engines/matching.spec.ts => 8 passed, including representative 48-candidate case at 0.74 ms; existing tests/engines/optimization.spec.ts => 8 passed. Static evidence: scoped deno fmt --check, deno lint, and git diff --check passed.

Verification: deno task test --quiet exited 0 with 266 passed, 21 ignored; matching.spec.ts ran 8/8 and optimization.spec.ts ran 8/8. Initial sandbox deno task verify exited 1 because GUI dependencies were absent and gui/scripts/verify-frontend-foundation.mjs hit spawnSync git EPERM. After npm --prefix gui ci (exit 0; npm reported 7 dependency audit vulnerabilities) and an approved escalated rerun, deno task verify exited 0: canonical docs, i18n, Deno, frontend tokens/foundation/boundaries, GUI unit tests, Next build, principal workflows, Storybook docs/build/interaction tests all PASS. TermSheetOptimizer Math.random usage remains intentionally outside this task because it owns excluded negotiation terms; the authoritative portfolio selector has no random behavior. No governed documentation asset or shared/API/CLI/agent/valuation path was changed.

Implementation commit: 62b34dfe58a5b0e230d430eabd9d86334b59d57. Worktree after commit contains only the CLI-managed MAI-145 task record; Graphify hook output was restored and is not part of the change. PR publication remains pending remote push/creation.

Draft PR #38 opened: https://github.com/luisfelipeluis49/mai/pull/38. Branch delivery/MAI-145-matching-and-portfolio-algorithms is pushed; implementation commit 62b34dfe58a5b0e230d430eabd9d86334b59d57 and verification-evidence commit 67f7976 are included. Human review and downstream merge coordination are pending; MAI-145 intentionally remains In Progress.

Review correction red loop: added equal-synergy regression at tests/engines/matching.spec.ts where portfolio-a + portfolio-b and portfolio-c have equal synergy and feasibility; pre-fix solver selected portfolio-c instead of canonical candidate-id ordering. Input permutations were included in the regression.

Tie-break correction implemented: solveCanonicalModel performs a primary synergy optimization, pins the exact primary optimum as an optimalSynergy constraint, and re-solves candidate inclusion decisions in canonical ID or seeded rank order. RankingContract now exposes tieBreakMethod=lexicographic-reoptimization. Regression passes for equal-synergy portfolios (portfolio-a + portfolio-b versus portfolio-c) across 4 input permutations and 3 repeated runs; pre-fix red case selected portfolio-c. Post-fix focused matching suite: 9 passed, including 48-candidate performance at 18.31 ms; legacy optimization suite: 8 passed. deno task test --quiet: 267 passed, 21 ignored. deno task verify: exit 0; all canonical documentation, i18n, Deno, frontend, GUI, Next, workflow, Storybook documentation/build/interaction checks PASS. Scope remains matching-only; MAI-145 remains In Progress pending human review.
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
