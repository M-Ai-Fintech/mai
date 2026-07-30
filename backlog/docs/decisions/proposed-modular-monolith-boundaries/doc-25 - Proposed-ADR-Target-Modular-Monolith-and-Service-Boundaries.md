---
id: doc-25
title: 'Proposed ADR: Target Modular Monolith and Service Boundaries'
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 06:34'
---
# Proposed ADR: Target Modular Monolith and Service Boundaries

- **Document ID:** doc-25
- **Status:** Proposed
- **Decision owner:** MAI owner

## Context

MAI spans transaction workflows, evidence, decisions, permissions, agents, and integrations. The current prototype is coupled through one API/store, while a premature service split would add distributed transactions and operational failure modes before domain and load boundaries are proven.

## Decision

Build a modular monolith with enforced bounded-context modules, context-owned application services and repositories, explicit public ports, one deployable API/worker codebase, and PostgreSQL context schemas. Domain events cross modules through a transactional outbox. A module may later become a service only with measured independent scaling, isolation, ownership, or availability needs and an executable extraction plan.

## Alternatives

- Preserve the current route/store monolith: rejected because it has no domain or authority boundaries.
- Start with microservices per workflow: rejected because boundaries and operational needs are not yet validated.
- Serverless function per route: rejected because it fragments transactions and encourages route-owned domain logic.

## Rationale

The modular monolith preserves local transactions and simple operations while making ownership, dependencies and future extraction explicit.

## Consequences

Imports across contexts are restricted to public contracts. Cross-context writes use commands/events, not shared tables. One deployment can still contain separate API and worker processes. Boundary tests and schema ownership become required.

## Migration implications

Establish shared primitives, then replace prototype slices context by context. Do not introduce compatibility abstractions that preserve the universal store.

## Unresolved risks

Module enforcement tooling, worker topology, projection latency objectives, and thresholds for future extraction need implementation evidence.

## Validation plan

Dependency tests must detect forbidden imports/table access; architecture review must show no universal Deal aggregate, shared repository, or direct cross-context write.
