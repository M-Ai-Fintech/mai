---
id: doc-5
title: Engine Architecture
type: specification
created_date: '2026-07-24 15:35'
updated_date: '2026-07-24 15:51'
tags:
  - architecture
  - engines
  - canonical
---
# Engine Architecture

- **Authority ID:** ARCH-ENGINE-001
- **Owner:** Engine Platform
- **Authority:** Canonical computational-engine architecture
- **Freshness:** Current for the prediction, optimization, and document engines documented by MAI-84
- **Language:** English
- **Update trigger:** Engine inputs/outputs, model-loading behavior, optimization constraints, failure semantics, artifact requirements, or document-generation boundaries change.

Engine source and tests are authoritative for exact inputs, outputs, constraints, and failure semantics.

## Prediction

`src/engines/prediction/onnx.ts` runs ONNX Runtime Web through the Transformers package’s Deno/WASM configuration. `loadOnnxModel(path)` establishes a process-local inference session. `ONNXEngine.runModelInference()` maps six financial inputs—EBITDA, revenue, total assets, total liabilities, operating cash flow, and historical volatility—to a float tensor and returns insolvency risk plus a derived Z-score label (`Safe`, `Grey`, or `Distress`).

`MLEngine.analyzeProfile()` adds best-effort text embedding generation and derives a DCF-risk label from the reported insolvency risk. It does not supply a mathematical fallback when ONNX loading or inference fails; callers must handle that failure. `AppBootstrapper` attempts to load `models/ma_classifier_q8.onnx` but permits startup when the artifact is absent.

The historical Colab/PyTorch material describes an intended training/export path. It is not proof that a checked-in model, reproducible training data, or a specific model architecture is currently available. Validate artifact provenance before using predictions in decisions.

## Portfolio and matching optimization

The optimization area provides constraint, valuation, matching, and genetic-search code under `src/engines/optimization/`. The portfolio workflow evaluates acquisition targets against budget, risk tolerance, optional tax-debt and sector-allocation caps, and mutual exclusions. The agent tool adapts inputs to `PortfolioSolver`; its public output is selected target IDs, spend, synergy, status, and evaluated profiles.

These results are decision support. They are not an autonomous investment mandate and must be reviewed with input assumptions.

## Negotiation optimization

`optimizeTermSheetTool` calls `optimizeDeal` in `src/engines/optimization/genetic.ts` with valuation bounds and preferences for cash, equity, earn-out, and escrow. The HTTP negotiation route combines the genetic result with KYB, leverage, and coverage constraints through `optimizeWithConstraints`. Agent behavior adds the policy layer: negotiation should present multiple strategic alternatives rather than select a binding deal.

## Documents

`src/engines/document-generator/` uses `pdf-lib` and includes PDF, LaTeX, and hybrid implementations. The current global PDF tool writes a term-sheet PDF to its requested path after validation. Closing workflow policy requires preview and human approval; no documentation may claim a LaTeX/PDF binary flow beyond what the invoked code and approval path implement.

See Local Setup and Runtime Operations for artifact prerequisites and Agent Architecture and Workflows for workflow-level constraints.
