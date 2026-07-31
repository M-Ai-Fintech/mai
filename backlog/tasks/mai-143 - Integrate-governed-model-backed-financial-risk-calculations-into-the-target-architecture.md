---
id: MAI-143
title: >-
  Integrate governed model-backed financial-risk calculations into the target
  architecture
status: To Do
assignee: []
created_date: '2026-07-31 05:02'
labels:
  - backend
  - architecture
  - prediction
  - diligence
  - calculations
  - evidence
  - model-governance
  - api
  - security
milestone: m-12
dependencies:
  - MAI-142
  - MAI-113
  - MAI-115
  - MAI-120
  - MAI-121
  - MAI-127
priority: high
ordinal: 129000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the mixed product-integration responsibilities previously held by MAI-23.

Integrate model-backed financial-risk calculations through the target bounded-context architecture without allowing a model, engine, or agent to create an unaudited human decision.

This task owns:
- the domain-owned inference application service;
- the typed inference port;
- exact input and evidence version references;
- immutable calculation provenance;
- model and artifact version recording;
- idempotent execution;
- stale-result invalidation;
- explicit real, fallback, unavailable, and failed states;
- permission-safe API contracts;
- governed agent access;
- banker-facing frontend adapter behavior.

This task does not own model training or the low-level runtime. Those belong to MAI-142.

Relationships:
- supersedes MAI-23;
- consumes MAI-142;
- integrates with MAI-113 evidence;
- integrates with MAI-115 findings and impacts;
- uses MAI-120 and MAI-121 governed agent boundaries;
- requires MAI-127 certification for production-readiness claims.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A domain-owned application service invokes inference only through a typed port.
- [ ] #2 Every inference request is scoped to the exact tenant, workspace, deal, actor, and authorization context.
- [ ] #3 Inputs reference exact financial-data, document, evidence, or calculation versions.
- [ ] #4 The authoritative request records: model ID and version; artifact checksum; runtime or adapter identity; exact input versions; actor; scope; correlation ID; idempotency key.
- [ ] #5 All declared model outputs are preserved in the immutable result.
- [ ] #6 Results explicitly distinguish: completed real inference; deterministic or configured fallback; unavailable capability; failed inference; cancelled execution; stale or superseded result.
- [ ] #7 A fallback result cannot be labelled, serialized, or displayed as genuine model inference.
- [ ] #8 The result records immutable provenance and can be traced to its inputs, artifact, runtime, actor, and execution.
- [ ] #9 Duplicate requests with the same idempotency key do not create duplicate authoritative results.
- [ ] #10 Changes to material inputs or evidence create a new result version or mark the previous result stale.
- [ ] #11 Agent access occurs only through a governed read or proposal tool.
- [ ] #12 An agent or model cannot approve, reject, publish, or finalize a human decision.
- [ ] #13 Authorization occurs before protected object loading and permission-safe DTO construction prevents metadata leakage.
- [ ] #14 APIs and frontend adapters use banker-facing terminology rather than /predict, /onnx, /model, /engine, or equivalent technical routes.
- [ ] #15 Tests cover: tenant and deal isolation; authorization-before-load; idempotency; exact-version provenance; stale input; unavailable runtime; failed runtime; explicit fallback; agent authority denial; immutable result history.
- [ ] #16 Focused tests and the canonical verification gate pass.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Every acceptance criterion is checked with evidence.
- [ ] #2 Model-backed calculations are integrated through a domain-owned service and typed port.
- [ ] #3 Exact input, evidence, model, and artifact versions are auditable.
- [ ] #4 Fallback, unavailable, failed, stale, and completed results are distinct.
- [ ] #5 Agent access preserves human authority.
- [ ] #6 API and frontend contracts are permission-safe and banker-facing.
- [ ] #7 Relevant domain, integration, security, and idempotency tests pass.
- [ ] #8 No mock or fallback result is presented as real model execution.
- [ ] #9 The canonical repository verification gate passes.
<!-- DOD:END -->
