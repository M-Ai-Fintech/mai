---
id: MAI-142
title: >-
  Rebuild and validate the ONNX financial-risk model artifact and local
  inference runtime
status: To Do
assignee: []
created_date: '2026-07-31 05:00'
updated_date: '2026-07-31 21:16'
labels:
  - backend
  - architecture
  - prediction
  - inference
  - model-governance
  - testing
  - delivery-wave-a
milestone: m-12
dependencies: []
priority: high
ordinal: 10300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the incomplete and prototype-oriented responsibilities previously held by MAI-34 and MAI-35 with one coherent task that owns reproducible model generation, artifact metadata, the complete ONNX tensor contract, and the local Deno/WASM inference runtime.

The existing notebook, ONNX artifact, loader, runtime tests, and benchmark code are useful baseline evidence. They must not be represented as a production-certified model capability.

This task owns:

- reference-model training and export;
- reproducible artifact generation;
- artifact manifest and checksum;
- exact six-input tensor validation;
- complete four-output tensor mapping;
- local Deno/WASM inference;
- typed initialization, artifact, inference, and fallback failures;
- development benchmark evidence;
- documentation of readiness limitations.

This task does not own:

- production model certification;
- business workflow integration;
- human approval;
- agent authority;
- model-backed domain persistence;
- frontend integration.

Those responsibilities belong to MAI-143 and MAI-127.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The complete model training and export process runs reproducibly from a clean documented Python or Colab environment.
- [ ] #2 Training or synthetic-data generation uses deterministic seeds and records the dataset source, generation method, schema, and limitations.
- [ ] #3 The generated model has an artifact manifest recording: model ID; model version; training-code version or commit; input schema; output schema; ONNX opset; quantization method; artifact checksum; generated timestamp; readiness classification.
- [ ] #4 The runtime validates exactly six ordered financial input features.
- [ ] #5 The runtime inspects and validates the model input and output tensor names, dimensions, and supported data types before accepting the artifact.
- [ ] #6 All four declared model outputs are mapped into a typed runtime result and covered by tests.
- [ ] #7 Missing, unreadable, corrupt, incompatible, or contract-invalid artifacts produce distinct typed failures.
- [ ] #8 Any configured fallback is explicitly represented as a fallback result with its own type, reason, and provenance. It must never be returned as genuine model inference.
- [ ] #9 The real application or adapter initialization path proves that the model can be loaded outside an isolated unit test.
- [ ] #10 Tests cover: reproducible export contract; artifact checksum; valid artifact load; exact six-input validation; complete four-output mapping; missing artifact; corrupt artifact; incompatible tensor contract; invalid input; inference before initialization; explicit fallback classification.
- [ ] #11 Development-machine P50 and P99 benchmark evidence is recorded without presenting it as a production SLA.
- [ ] #12 Documentation clearly states whether the artifact uses synthetic, demonstration, research, or production-qualified data.
- [ ] #13 The task makes no claim of statistical usefulness, production certification, or regulatory suitability without evidence.
- [ ] #14 Focused tests and `deno task verify` pass.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Record that the following baseline assets already exist and must be assessed rather than recreated blindly:

- scripts/colab_training_notebook.ipynb;
- models/ma_classifier_q8.onnx;
- src/engines/prediction/onnx.ts;
- src/engines/prediction/index.ts;
- src/engines/prediction/onnx.test.ts;
- tests/engines/prediction.spec.ts.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Every acceptance criterion is checked with current evidence.
- [ ] #2 A reproducible model-generation procedure and committed artifact manifest exist.
- [ ] #3 The runtime enforces the complete six-input and four-output contract.
- [ ] #4 Failure and fallback behavior is typed and tested.
- [ ] #5 Existing MAI-34 and MAI-35 code and tests are retained as baseline or migration evidence unless explicitly replaced.
- [ ] #6 Documentation distinguishes reference-runtime readiness from production model certification.
- [ ] #7 The canonical repository verification gate passes.
- [ ] #8 No mock, synthetic, fallback, or prototype capability is presented as production-ready.
<!-- DOD:END -->
