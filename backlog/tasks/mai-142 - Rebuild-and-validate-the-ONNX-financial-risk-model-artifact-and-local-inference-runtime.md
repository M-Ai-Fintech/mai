---
id: MAI-142
title: >-
  Rebuild and validate the ONNX financial-risk model artifact and local
  inference runtime
status: In Progress
assignee: []
created_date: '2026-07-31 05:00'
updated_date: '2026-08-01 12:23'
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
references:
  - 'https://github.com/luisfelipeluis49/mai/pull/34'
modified_files:
  - backlog/docs/architecture/engines/doc-5 - Engine-Architecture.md
  - models/ma_classifier_q8.onnx
  - models/ma_classifier_q8.manifest.json
  - models/ma_classifier_q8.onnx.sha256
  - scripts/colab_training_notebook.ipynb
  - scripts/export_reference_model.py
  - src/core/boot.ts
  - src/engines/prediction/artifact.ts
  - src/engines/prediction/contracts.ts
  - src/engines/prediction/errors.ts
  - src/engines/prediction/index.ts
  - src/engines/prediction/onnx-protobuf.ts
  - src/engines/prediction/onnx.test.ts
  - src/engines/prediction/onnx.ts
  - tests/engines/prediction-artifact.spec.ts
  - tests/engines/prediction.spec.ts
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
- [x] #1 The complete model training and export process runs reproducibly from a clean documented Python or Colab environment.
- [x] #2 Training or synthetic-data generation uses deterministic seeds and records the dataset source, generation method, schema, and limitations.
- [x] #3 The generated model has an artifact manifest recording: model ID; model version; training-code version or commit; input schema; output schema; ONNX opset; quantization method; artifact checksum; generated timestamp; readiness classification.
- [x] #4 The runtime validates exactly six ordered financial input features.
- [x] #5 The runtime inspects and validates the model input and output tensor names, dimensions, and supported data types before accepting the artifact.
- [x] #6 All four declared model outputs are mapped into a typed runtime result and covered by tests.
- [x] #7 Missing, unreadable, corrupt, incompatible, or contract-invalid artifacts produce distinct typed failures.
- [x] #8 Any configured fallback is explicitly represented as a fallback result with its own type, reason, and provenance. It must never be returned as genuine model inference.
- [x] #9 The real application or adapter initialization path proves that the model can be loaded outside an isolated unit test.
- [x] #10 Tests cover: reproducible export contract; artifact checksum; valid artifact load; exact six-input validation; complete four-output mapping; missing artifact; corrupt artifact; incompatible tensor contract; invalid input; inference before initialization; explicit fallback classification.
- [x] #11 Development-machine P50 and P99 benchmark evidence is recorded without presenting it as a production SLA.
- [x] #12 Documentation clearly states whether the artifact uses synthetic, demonstration, research, or production-qualified data.
- [x] #13 The task makes no claim of statistical usefulness, production certification, or regulatory suitability without evidence.
- [x] #14 Focused tests and `deno task verify` pass.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preserve the task branch and assess the existing notebook, q8 ONNX artifact, loader, PredictionEngine, AppBootstrapper boot path, and MAI-34/35 tests as baseline evidence; do not change MAI-143 domain integration.
2. Establish a deterministic synthetic reference-model export contract with fixed seeds, documented schema/limitations, versioned artifact metadata, checked-in manifest/checksum, and reproducibility validation; retain the existing baseline assets and update the Colab procedure.
3. Replace implicit ONNX assumptions with typed artifact, contract, initialization, inference, and fallback results. Validate exactly six ordered features plus model input/output names, dimensions, and float type before accepting the artifact, then map all four output values into the typed result.
4. Make the real AppBootstrapper initialization path load and validate the reference artifact, and add focused tests for valid, missing, unreadable, corrupt, incompatible, invalid-input, pre-initialization, fallback, golden-vector, checksum, reproducibility, boot, and benchmark behavior.
5. Update governed engine/runtime documentation with synthetic-data and non-certification limitations; run focused checks and deno task verify with definitive status; record provenance, checksum, benchmark evidence, risks, and rollback as reverting the artifact/manifest pair.
6. Commit the implementation, push the isolated MAI-142 branch, and open a non-merged PR containing MAI-142. Leave the Backlog task In Progress as explicitly required by the prompt.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Record that the following baseline assets already exist and must be assessed rather than recreated blindly:

- scripts/colab_training_notebook.ipynb;
- models/ma_classifier_q8.onnx;
- src/engines/prediction/onnx.ts;
- src/engines/prediction/index.ts;
- src/engines/prediction/onnx.test.ts;
- tests/engines/prediction.spec.ts.

Intake evidence: branch delivery/MAI-142-onnx-artifact-and-runtime was clean at b66526e; MAI-143 explicitly consumes this task and owns later domain integration. Existing artifact loads as input financials and output predictions [1,4], while the runtime consumes only output slot 0. Remote Backlog/GitHub fetches are unavailable in this worktree because the shared worktree FETCH_HEAD is read-only; local task view and branch evidence remain available.

Implementation slice: regenerated opset-17 dynamic-batch q8 reference artifact with deterministic Python exporter and manifest/checksum; added protobuf tensor inspection, exact six-input validation, complete four-value mapping, typed artifact/input/inference failures, explicit heuristic fallback provenance, and real AppBootstrapper initialization. Focused verification: DENO_ENV=test deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net src/engines/prediction/onnx.test.ts tests/engines/prediction.spec.ts tests/engines/prediction-artifact.spec.ts => 16 passed, 0 failed. Export verification: PYTHONPATH=/tmp/mai142-python python3 scripts/export_reference_model.py --check-reproducibility => repeated q8 checksum 8c98e803d9a636b886267bca6028237f52f9decccf4f4200d47ad3e13a5f0d66.

Final verification evidence: focused Deno artifact/runtime suite exited 0 with 16 passed and 0 failed; benchmark output on this development machine was P50 0.05 ms and P99 0.10 ms against the test thresholds of <100 ms and <200 ms, and is not a production SLA. Full deno task test exited 0 with 265 passed, 0 failed, and 21 ignored. Elevated deno task verify exited 0 with all 17 checks PASS: canonical docs, i18n, Deno tests, frontend boundaries, GUI units, Next production build, workflows, Storybook docs/build/interactions. Restricted verification initially exposed missing GUI dependencies and then sandbox EPERM on local port binding; npm --prefix gui ci installed the locked 555-package environment, and the elevated run completed the required local-server checks. Export reproducibility exited 0 using PYTHONPATH=/tmp/mai142-python python3 scripts/export_reference_model.py --check-reproducibility --output-dir /tmp/mai142-export-final; repeated and checked-in q8 checksum is 8c98e803d9a636b886267bca6028237f52f9decccf4f4200d47ad3e13a5f0d66. Notebook JSON validation passed with nbformat 4 and 7 cells. deno fmt --check, deno check of the changed runtime modules, and git diff --check exited 0. Configuration closure PASS: checked-in models/ma_classifier_q8.onnx plus manifest and SHA sidecar flow through artifact.ts checksum/protobuf contract validation into onnx.ts load/inference, PredictionEngine, and the real AppBootstrapper initializer; exact consumer inventory remains outside MAI-143 domain integration, no secrets or production provider are required, and missing/unreadable/corrupt/invalid/fallback paths are covered by typed regression tests. Reference-only synthetic limitations and rollback as reverting the artifact/manifest/sidecar pair are documented; PR and human review remain pending, so MAI-142 stays In Progress.

Draft PR handoff: https://github.com/luisfelipeluis49/mai/pull/34 is open against master from delivery/MAI-142-onnx-artifact-and-runtime at commit 9199aaa5341b3ef2609095d08098471bda9ab196; the connector confirms draft=true, merged=false, and no merge commit. Human owner review and any required PR checks remain pending; the agent must not self-approve or merge. GitHub CLI token was invalid, but the connected GitHub action created the PR successfully.

PR metadata refresh: after recording the reference, commit 077949f was pushed; PR #34 now has two commits, head SHA 077949f1f3df37739a406822b6bae225c386ee1b, remains open/draft/unmerged, and a human-review request comment was added.
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
