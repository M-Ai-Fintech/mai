---
id: doc-5
title: Engine Architecture
type: specification
created_date: '2026-07-24 15:35'
updated_date: '2026-07-30 06:37'
tags:
  - architecture
  - engines
  - canonical
---
# Engine Architecture

- **Authority ID:** ARCH-ENGINE-001
- **Owner:** Engine Platform
- **Authority:** Canonical target engine boundary proposed by MAI-103
- **Freshness:** Proposed as of 2026-07-30
- **Language:** English
- **Update trigger:** Calculation/model ports, provenance, asynchronous execution, approval boundaries or artifact maturity changes

## Target boundary

Prediction, optimization, valuation, matching and document-rendering code is adapted as pure, typed calculation capability behind the owning bounded context’s application service. Engines do not own workflow state, authorization, approval, persistence, external communication or transaction truth.

Every execution records exact input and source versions, algorithm/model/artifact checksum, configuration, output, timing and limitations. Deterministic work may complete synchronously within the API budget; slow/model/provider work uses durable jobs. Stale input invalidates the resulting calculation or draft without deleting it.

## Domain ownership

- Valuation owns scenario, inputs, computation result and human approval; no engine sets transaction price.
- Matching owns criteria/run/candidate projection; Conflict and Shortlist authority remain explicit human workflows.
- Negotiation optimization can calculate alternatives/BATNA but internal strategy is field restricted and an engine cannot approve or send.
- Document generators render versioned deliverable drafts; redaction, approval, release and distribution are separate human-controlled states.
- Prediction output is a versioned model recommendation with artifact provenance, never a fact or decision.

## Integration maturity

Maturity is one of interface only, local fixture, sandbox, partially implemented, production candidate or production verified. Fallbacks are explicit result types and audited; a heuristic or local fixture is never silently labeled provider success.

## Current implementation

Existing valuation/optimization/prediction/generator algorithms and tests are **Adapt** candidates. Generic engine routes/stores are **Replace**. KYC solver ownership requires product/domain confirmation. Detailed disposition, API/job contracts and implementation tasks are in doc-22–24.
