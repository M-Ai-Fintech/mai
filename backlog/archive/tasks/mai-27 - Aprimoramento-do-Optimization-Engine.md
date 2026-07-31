---
id: MAI-27
title: Aprimoramento do Optimization Engine
status: To Do
assignee:
  - Luís Silva
created_date: '2026-07-08 02:26'
updated_date: '2026-07-31 05:09'
labels:
  - engine
  - optimization
  - revalidation
milestone: m-11
dependencies: []
priority: medium
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Optimization Engine is the core mathematical component within the MVP, handling two distinct but interrelated problems:
1. **Term‑Sheet Matching** – a custom Genetic Algorithm that seeks Pareto‑optimal agreements between buyer and seller preferences while respecting configurable utility thresholds.
2. **Portfolio Allocation & KYC Compliance** – a Mixed‑Integer Linear Programming (MILP) / Constraint Programming solver that distributes capital across multiple assets, enforcing regulatory constraints such as tax‑debt caps, sector‑allocation limits, and insolvency‑risk thresholds.

Currently both algorithms are duplicated in the CLI (`src/cli/commands.ts`) and the Agent actions (`src/agent/actions.ts`). This duplication creates maintenance overhead, inconsistent behavior, and hampers the addition of new compliance rules. The goal of this task is to centralize the optimization logic under `src/engines/optimization/`, expose a clean TypeScript API, enrich the constraint set, and ensure high test coverage and documentation compliance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Centralize the Genetic Algorithm for Term Sheets in `src/engines/optimization/matching/term_sheet_optimizer.ts` and remove all duplicate implementations from the CLI and Agent actions.
- [ ] #2 Centralize the MILP / Constraint Programming portfolio solver in `src/engines/optimization/kyc/kyc_valuation_solver.ts`, introducing at least three new compliance constraints (tax‑debt cap, sector‑allocation cap, insolvency‑risk threshold).
- [ ] #3 All CLI commands (`src/cli/commands.ts`) and Agent actions (`src/agent/actions.ts`) must import and use the consolidated modules without any remaining direct optimization code.
- [ ] #4 The Genetic Algorithm must reliably converge to a Pareto‑optimal solution within a configurable number of generations (default ≤ 200) and respect minimum utility constraints for both parties.
- [ ] #5 Unit and integration test coverage for the Optimization Engine must be ≥ 90 % (reported by `deno coverage`) and include tests for feasible, infeasible, and constraint‑violation scenarios.
- [ ] #6 CI pipeline must run lint, type‑check, and the full test suite with the new modules and fail on regression.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. **Phase 1 – Interface Design**: Create a shared `src/engines/optimization/types.ts` defining input and output contracts for both the Genetic Optimizer and the MILP Solver. Add Zod schemas for runtime validation.
2. **Phase 2 – Term‑Sheet Genetic Optimizer**:
   - Migrate existing GA code from `src/cli/commands.ts` and `src/agent/actions.ts` to `src/engines/optimization/matching/term_sheet_optimizer.ts`.
   - Export a `TermSheetOptimizer` class with methods `run(params)` and `evaluate(solution)`.
   - Add a barrel export in `src/engines/optimization/matching/index.ts`.
3. **Phase 3 – Portfolio & KYC MILP Solver**:
   - Implement `src/engines/optimization/kyc/kyc_valuation_solver.ts` using `ortools` (or a WASM‑compatible MILP library).
   - Introduce three new compliance constraints: tax‑debt cap, sector‑allocation cap, insolvency‑risk threshold.
   - Provide a unified `PortfolioSolver` API.
4. **Phase 4 – Refactor Consumers**:
   - Update CLI command implementations (`src/cli/commands.ts`) to call `TermSheetOptimizer` and `PortfolioSolver`.
   - Update Agent actions (`src/agent/actions.ts`) to use the same APIs.
5. **Phase 5 – Testing Strategy**:
   - Write unit tests for each optimizer covering happy paths, constraint violations, and edge‑case parameter values.
   - Add integration tests that run the full optimization pipeline on a representative dataset.
   - Ensure total coverage ≥ 90 % via `deno coverage`.
6. **Phase 6 – CI & Performance Benchmarks**:
   - Extend the GitHub Actions workflow to include lint, type‑check, and coverage thresholds.
   - Add a benchmark script (`scripts/benchmark_optimization.ts`) to verify that the GA converges within the configured generation limit and that the MILP solves within 2 seconds for typical portfolio sizes.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Technical Audit
created: 2026-07-09 21:35
---
[CRITICAL REVIEW] The task was marked Done, but AC #1, AC #3, and DoD #2 failed: `MILPOptimizer` remained duplicated in `src/agent/actions.ts` (lines 31–121), and `optimizePortfolioTool` used the old duplicate implementation instead of importing the new `PortfolioSolver` from `kyc_valuation_solver.ts`.
---

created: 2026-07-09 21:52
---
Critical review resolved: Removed the duplicate `MILPOptimizer` from `actions.ts` and integrated `optimizePortfolioTool` with the new `PortfolioSolver`.
---

author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: Optimization components exist, but a colocated genetic-selection test fails and is excluded by the canonical Deno test include pattern. Reopen until all optimizer tests are discovered, deterministic, and green.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---

created: 2026-07-31 05:09
---
Superseded by:

- MAI-144 — deterministic valuation and synergy calculations;
- MAI-145 — matching and portfolio-selection optimization;
- MAI-146 — negotiation term-sheet proposal optimization.

Carried forward:

- centralization of mathematical logic;
- typed APIs;
- budget, risk, tax, sector, and exclusion constraints;
- buyer and seller utility constraints;
- feasible and infeasible tests;
- deterministic behavior;
- performance evidence;
- removal of duplicate mathematical implementations.

Changed architecture:

- no generic Optimization Engine business boundary;
- valuation, matching, and negotiation own separate algorithms;
- pure mathematical modules do not own agents, APIs, persistence, approvals, or frontend workflows;
- negotiation optimizer cannot send, approve, or accept terms;
- randomness must be removed or explicitly seeded;
- KYC/valuation naming cannot own matching portfolio selection.

Existing mathematical code and tests remain migration evidence.

Archive does not authorize code deletion or file movement.
---
<!-- COMMENTS:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 All mathematical optimization code lives exclusively under `src/engines/optimization/`.
- [ ] #2 No duplicate optimization logic remains in the CLI or Agent codebases.
- [ ] #3 Unit and integration tests in `tests/engines/optimization.spec.ts` run cleanly with `deno test --allow-read` and achieve ≥ 90 % coverage.
- [ ] #4 Lint (`deno lint`) and TypeScript type‑checking (`deno check`) succeed with zero errors.
- [ ] #5 Module documentation (README and API docs) is up‑to‑date and generated by `deno doc`.
- [ ] #6 Performance benchmarks confirm the Genetic Algorithm converges within the default generation limit and the MILP solver resolves typical portfolios in ≤ 2 seconds.
- [ ] #7 CI pipeline passes all stages (lint, type‑check, test, coverage, benchmark) on the main branch.
<!-- DOD:END -->
