---
id: MAI-153
title: Evaluate and approve a governed Brazilian M&A model-adaptation strategy
status: To Do
assignee: []
created_date: '2026-07-31 18:32'
updated_date: '2026-07-31 21:17'
labels:
  - backend
  - architecture
  - ai
  - model-governance
  - evaluation
  - fine-tuning
  - legal
  - finance
  - privacy
  - post-mvp
  - delivery-wave-k
milestone: m-13
dependencies:
  - MAI-121
  - MAI-125
  - MAI-127
  - MAI-152
priority: medium
ordinal: 110100
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Determine whether Brazilian M&A model adaptation is justified and, when it is, define an approved implementation strategy.

This is a decision and evaluation task.

It must not assume that fine-tuning or LoRA is required.

The task compares:

- approved base-model performance;
- versioned prompt engineering;
- governed retrieval and knowledge bundles;
- structured domain tools;
- few-shot examples;
- model fine-tuning or LoRA adaptation.

The task may conclude either:

- Go — evidence supports creating a separate model-adaptation implementation task; or
- No-go — another strategy provides better quality, safety, cost, or operational characteristics.

This task owns:

- baseline definition;
- Brazilian legal and financial evaluation scope;
- dataset-readiness analysis;
- strategy comparison;
- quality, safety, privacy, cost, and operational evaluation;
- adaptation decision;
- implementation requirements for a future Go decision;
- current fake-capability retirement requirements.

This task does not own:

- unconditional LoRA training;
- model artifact generation;
- runtime adapter implementation;
- production model deployment;
- provider certification;
- direct agent-tool implementation;
- automatic dataset creation from customer data;
- production release approval.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The approved evaluation scope defines the Brazilian M&A legal and financial capabilities to assess.
- [ ] #2 The scope includes representative examples such as: change-of-control clauses; tag-along and drag-along; EBITDA normalization; working-capital adjustments; indemnification; escrow; earn-out; tax contingencies; labor contingencies; regulatory conditions; conditions precedent; Brazilian corporate terminology.
- [ ] #3 The task establishes an approved baseline model and exact baseline version.
- [ ] #4 The comparison evaluates at minimum: base model only; versioned prompt improvements; governed retrieval; versioned knowledge bundles; structured domain tools; few-shot examples; fine-tuning or LoRA adaptation.
- [ ] #5 Every strategy uses the same approved evaluation dataset and scoring methodology where technically applicable.
- [ ] #6 Evaluation measures at minimum: Brazilian legal and financial accuracy; evidence grounding; unsupported factual claims; structured-output validity; instruction adherence; terminology consistency; human-authority compliance; confidentiality and memorization risk; latency; cost; provider constraints; operational complexity; rollback complexity; regression risk.
- [ ] #7 Evaluation results include confidence intervals or otherwise appropriate uncertainty reporting where applicable.
- [ ] #8 Human expert review criteria and reviewer qualifications are explicit.
- [ ] #9 Dataset provenance records: source; collection authority; copyright or licensing position; confidentiality classification; personal-data treatment; customer-data restrictions; redaction; de-identification; deduplication; retention; deletion behavior.
- [ ] #10 No privileged, confidential, personal, restricted, or customer-derived data enters a training recommendation without explicit approved authority.
- [ ] #11 Train, development, and evaluation contamination controls are documented.
- [ ] #12 A No-go decision is a valid successful outcome when evidence does not justify model adaptation.
- [ ] #13 A Go decision requires a separate implementation task and records: approved base model and license; approved provider or runtime; immutable dataset version; training-code commit; reproducible environment; hyperparameters; random seed; adapter or model checksum; model card; evaluation evidence; safety evidence; artifact registry requirements; quantization requirements; rollout; rollback; retention and deletion behavior.
- [ ] #14 No model-adaptation implementation may claim production readiness before MAI-127 environment-specific certification.
- [ ] #15 Runtime model use must occur through the governed model-provider port and ToolGateway boundaries.
- [ ] #16 Runtime use must not occur through a direct generic `huggingFaceMcpTool` capability.
- [ ] #17 The strategy explicitly rejects fake success responses for: adapter loading; model loading; fine-tuned inference; quantization; provider availability.
- [ ] #18 Gemini or another base-model response cannot be labelled as fine-tuned inference unless the configured runtime actually executed the approved adapted model.
- [ ] #19 Missing or unavailable model-adaptation capability returns an explicit unavailable or unsupported result.
- [ ] #20 Any future adapted-model result records: model ID; base-model version; adapter version; artifact checksum; provider/runtime; prompt version; input/evidence versions; execution identity; fallback state.
- [ ] #21 A fallback result cannot be presented as adapted-model inference.
- [ ] #22 The final decision document records: selected strategy; rejected alternatives; evidence; quality delta; safety delta; cost delta; operational delta; open risks; approval authority.
- [ ] #23 Tests or validation scripts prove that fake adapter-loading and fake fine-tuned inference cannot satisfy the future governed contract.
- [ ] #24 Focused validation and the canonical repository verification gate pass when MAI-153 is implemented.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- MAI-153 is intentionally post-MVP.
- Fine-tuning is a hypothesis to evaluate, not a required deliverable.
- The existing Python scripts, JSONL examples, FineTuningRegistry, `huggingFaceMcpTool`, and tests are migration evidence only.
- Existing fake adapter-loading and mock fine-tuned responses are not valid capability evidence.
- A future implementation task must be separately approved after a Go decision.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Every acceptance criterion is checked with current evidence.
- [ ] #2 A common evaluation dataset and methodology have been approved.
- [ ] #3 All required strategies have been compared.
- [ ] #4 Data provenance, licensing, privacy, retention, and deletion decisions are explicit.
- [ ] #5 Expert review evidence is recorded.
- [ ] #6 A formal Go or No-go decision exists.
- [ ] #7 A Go decision creates a separate implementation task rather than silently expanding MAI-153.
- [ ] #8 A No-go decision records the approved alternative strategy.
- [ ] #9 Current fake LoRA and fine-tuned-inference capabilities have an explicit retirement path through MAI-121 and MAI-129.
- [ ] #10 MAI-153 remains outside the MAI-131 MVP release dependency graph.
- [ ] #11 The canonical repository verification gate passes.
<!-- DOD:END -->
