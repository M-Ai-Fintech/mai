---
id: doc-26
title: 'Proposed ADR: Bounded Contexts and Aggregate Ownership'
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 09:32'
---
# Proposed ADR: Bounded Contexts and Aggregate Ownership

- **Authority ID:** doc-26
- **Owner:** Architecture
- **Authority:** Accepted ADR: Bounded Contexts and Aggregate Ownership
- **Status:** Accepted
- **Freshness:** Accepted as of 2026-07-30; original decision content retained
- **Language:** English
- **Update trigger:** A superseding owner-approved architecture decision, implementation evidence, or a material boundary change
- **Document ID:** doc-26
- **Decision owner:** MAI owner

## Context

The approved frontend crosses organization, deal, evidence, approval, valuation, negotiation, closing, agent, access and distribution workflows. Treating all transaction data as one Deal object would create an unbounded transactional and concurrency boundary.

## Decision

Adopt the contexts and aggregate ownership in doc-20. Deal Management owns deal identity, parties, mandate, lifecycle and milestones. Work Management owns workstreams, tasks and approval requests. Diligence & Decisions owns facts, interpretations, assumptions, generic calculations, findings and decision records; Valuation owns models, scenarios, inputs and results while referencing exact upstream versions. Other contexts own their document/evidence, matching, negotiation, closing, agent, access, deliverable, governance, notification, integration and audit responsibilities. Aggregate-owned children are updated transactionally with their root. All other concepts are references by stable ID and expected version; cross-context consistency is explicit through application orchestration, events and projections.

## Alternatives

- Universal Deal aggregate: rejected due to contention, accidental coupling and impossible transactional scope.
- Table-oriented CRUD modules: rejected because workflow invariants and human authority would be implicit.
- Event-sourced aggregate for every concept: rejected as unnecessary complexity; append-only facts are selected where required.

## Rationale

The boundaries align with language, invariants, authority and change cadence rather than screens or current routes.

## Consequences

Some UI views are projections over several contexts and may be eventually consistent. Cross-context commands validate referenced versions. No context may mutate another context’s tables.

## Migration implications

Current entity/deal/store records are decomposed through explicit import mappings. Ambiguous legacy state imports as proposed/unverified rather than approved truth.

## Unresolved risks

Final ownership of risk/KYB concepts and exact granularity of external participation may change after implementation discovery; changes require an ADR amendment.

## Validation plan

For each root, tests prove invariants, owned-versus-referenced objects, concurrency boundary and human-only/irreversible transitions.
