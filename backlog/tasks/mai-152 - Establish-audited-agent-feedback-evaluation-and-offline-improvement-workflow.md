---
id: MAI-152
title: 'Establish audited agent feedback, evaluation, and offline improvement workflow'
status: To Do
assignee: []
created_date: '2026-07-31 18:32'
labels:
  - backend
  - architecture
  - agent
  - model-governance
  - feedback
  - evaluation
  - audit
  - evidence
  - privacy
  - post-mvp
milestone: m-13
dependencies:
  - MAI-109
  - MAI-113
  - MAI-120
  - MAI-121
  - MAI-125
priority: medium
ordinal: 138000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the prototype online “Continuous Learning” loop with an audited, offline, human-governed improvement workflow.

Broker feedback and specialist corrections are valuable product and model quality evidence, but they must not silently modify production prompts, knowledge, tool behavior, model configuration, or model weights.

Every feedback record must reference the exact execution context that produced the reviewed output.

This task owns:

- structured feedback attached to exact agent execution records;
- feedback classification;
- immutable original output and feedback history;
- evidence, prompt, model, tool, and definition-version lineage;
- dataset eligibility and exclusion decisions;
- versioned offline evaluation datasets;
- quality, safety, grounding, and authority regression suites;
- proposals to modify prompts, knowledge bundles, tools, or model configuration;
- separate human review and promotion decisions;
- rollback evidence;
- retention, deletion, redaction, and legal-hold behavior for feedback and evaluation datasets.

This task does not own:

- runtime self-learning;
- automatic prompt mutation;
- automatic model-weight updates;
- direct production deployment;
- model-provider implementation;
- agent-runner implementation;
- final model-adaptation implementation;
- CLI interaction;
- production release approval.

Feedback is evidence, not automatically authoritative domain knowledge.

A user preference cannot override:

- law;
- policy;
- evidence;
- permissions;
- human-only decisions;
- approved financial or legal controls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every feedback record references the exact: tenant or institution; workspace; Deal; actor; Agent Mission; Agent Run; Step; Result or Artifact; Tool Activity where applicable; evidence version; prompt version; model and provider version; agent-definition version; timestamp.
- [ ] #2 Feedback categories are explicit and include at minimum: factual correction; user preference; quality rating; accepted proposal; rejected proposal; missing evidence; policy or compliance escalation; unsafe or misleading output; structured reviewer comment.
- [ ] #3 Feedback records distinguish: reviewer statement; original model output; corrected or preferred output; supporting evidence; reviewer authority; dataset eligibility; promotion status.
- [ ] #4 The original model output and original feedback record are immutable.
- [ ] #5 Later corrections create new linked versions rather than overwriting history.
- [ ] #6 Feedback cannot be written without authorization for the referenced workspace, Deal, execution, and result.
- [ ] #7 Permission checks occur before protected execution or artifact data is loaded.
- [ ] #8 Feedback APIs and projections omit protected fields rather than exposing them and relying only on frontend hiding.
- [ ] #9 Dataset eligibility records: data classification; provenance; collection authority; consent or contractual basis where applicable; redaction state; retention; legal hold; deletion restrictions; reviewer decision.
- [ ] #10 Customer-confidential, privileged, personal, restricted, or legally held data cannot enter an improvement dataset without an explicit approved eligibility decision.
- [ ] #11 Evaluation datasets are immutable, versioned, and checksummed.
- [ ] #12 Evaluation examples record exact source lineage and cannot be silently edited after publication.
- [ ] #13 Train, development, and evaluation sets have explicit contamination and duplication checks.
- [ ] #14 Offline evaluation covers at minimum: factual accuracy; evidence grounding; unsupported factual claims; structured-output validity; instruction adherence; human-authority boundaries; restricted-side-effect denial; security and privacy behavior; stale-evidence handling; regression against prior approved versions.
- [ ] #15 Runtime feedback does not automatically: change a system prompt; change a knowledge bundle; change a tool; change a model; change a provider; create domain knowledge; modify model weights.
- [ ] #16 Any proposed prompt, knowledge, tool, model, or configuration change has a separate reviewable change record.
- [ ] #17 Promotion requires explicit human approval and records: evaluator; approver; evaluation version; baseline comparison; accepted regressions; rollout plan; rollback plan.
- [ ] #18 Rejected improvement proposals remain auditable.
- [ ] #19 Preferences cannot override legal, policy, evidence, authorization, financial-control, or human-only decision boundaries.
- [ ] #20 Compliance or policy conflicts are represented as explicit governed findings or escalations, not inferred solely from vector similarity or keywords.
- [ ] #21 Process-local memory or file caches cannot become authoritative feedback storage.
- [ ] #22 No silent fallback may present an unpersisted or unreviewed feedback record as successfully governed.
- [ ] #23 Retention, deletion, legal-hold, redaction, and erasure behavior is traced to MAI-125.
- [ ] #24 Tests cover: authorization-before-load; cross-tenant and cross-deal isolation; immutable history; exact execution lineage; dataset eligibility; dataset versioning; contamination detection; promotion approval; rollback metadata; prohibited runtime self-modification; policy and human-authority preservation.
- [ ] #25 Focused tests and the canonical repository verification gate pass when MAI-152 is implemented.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- MAI-152 is intentionally post-MVP.
- The task preserves useful feedback but rejects autonomous production self-learning.
- Runtime feedback collection may later be exposed through governed product interfaces, but promotion remains offline and human-reviewed.
- `src/agent/continuous_learning.ts` remains migration evidence until MAI-121 replaces its runtime ownership and MAI-129 retires obsolete code.
- Semantic retrieval may support dataset analysis, but similarity is not a compliance or policy authority.
<!-- SECTION:NOTES:END -->
