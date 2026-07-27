# Computational Engines Subsystem Agent Instructions (`src/engines/`)

This directory contains the computational, analytical, financial valuation, optimization, machine learning prediction, and document generation engines for MAI.

## Architecture & Submodules

- **`optimization/`**: Mathematical optimization algorithms and financial solvers.
  - `valuation/methods/`: Financial valuation models including Discounted Cash Flow (`discounted_cash_flow.ts`), EBITDA (`ebitda.ts`), Book Value (`book_value.ts`), Enterprise Value (`enterprise_value.ts`), Market Capitalization (`market_capitalization.ts`), and Growing Perpetuity (`growing_perpetuity.ts`).
  - `valuation/reconciliation/`: Valuation reconciliation models including DLOM (`dlom.ts`), JCP (`jcp.ts`), and contingencies adjustment (`contingencies.ts`).
  - `matching/`: Term sheet optimizer (`term_sheet_optimizer.ts`) and M&A buyer/target matching engine.
  - `kyc/`: KYC valuation solver (`kyc_valuation_solver.ts`).
  - `genetic.ts` & `constraints.ts`: Genetic algorithm engine and linear constraint formulations using `javascript-lp-solver`. Includes unit tests (`genetic.test.ts`, `constraints_test.ts`).
- **`prediction/`**: Machine learning inference and model execution.
  - `onnx.ts`: ONNX runtime execution for M&A classification models stored in `models/` at root (`models/ma_classifier_q8.onnx`, `models/ma_classifier.onnx`). Includes unit test `onnx.test.ts`.
  - `ml.ts` & `transformers.ts`: Feature extraction and neural embeddings via `@huggingface/transformers`.
- **`document-generator/`**: Automated document and report creation.
  - `pdf.ts`: PDF generation utilizing `pdf-lib`.
  - `latex.ts`: LaTeX template compilation.

## Runtime Environment & Dependencies

- **Runtime**: Deno runtime using npm specifier imports defined in `deno.json`.
- **Imports**: Uses `npm:pdf-lib`, `npm:javascript-lp-solver`, and `npm:@huggingface/transformers`.
- **Hardware Acceleration & Native Execution**: FFI/Native execution flags (`--allow-ffi`) required for ONNX model execution.

## Key Commands & Operations

- **Run All Engine Tests**: `deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net tests/engines/`
- **Run Optimization Engine Unit Tests**: `deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net src/engines/optimization/genetic.test.ts src/engines/optimization/constraints_test.ts`
- **Run ONNX Prediction Unit Tests**: `deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net src/engines/prediction/onnx.test.ts`

## Key Interfaces & Operational Patterns

- **Pure Functional Logic**: Engine calculations should be deterministic, stateless, and pure functions wherever possible to ensure reliable unit testing.
- **Strict Input Validation**: Inputs to financial solvers and optimization models must be validated using defined Zod schemas or strict TypeScript interfaces in `src/engines/optimization/types.ts`.
- **Model Fallback Resilience**: ML and ONNX prediction calls must gracefully handle missing weights or failed ONNX session initializations with heuristic fallbacks.

## Documentation Governance

Canonical financial engine formulas and system specifications live under [`backlog/docs/`](../../backlog/docs/index/doc-10%20-%20Documentation-Index-and-Information-Architecture.md) (specifically `doc-02-Engine-Specs.md`). This file provides directory-local implementation guidance.
