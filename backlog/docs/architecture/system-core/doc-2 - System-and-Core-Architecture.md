---
id: doc-2
title: System and Core Architecture
type: specification
created_date: '2026-07-24 15:35'
updated_date: '2026-07-30 06:37'
tags:
  - architecture
  - core
  - canonical
---
# System and Core Architecture

- **Authority ID:** ARCH-SYS-001
- **Owner:** Platform Architecture
- **Authority:** Canonical target system boundary proposed by MAI-103; implementation remains future work
- **Freshness:** Proposed as of 2026-07-30
- **Language:** English
- **Update trigger:** Bounded contexts, deployment boundary, persistence, event/job transport, security boundary, or migration decision changes

## Target architecture

MAI is a modular monolith with explicit bounded contexts, context-owned schemas/repositories/application services, one versioned HTTP API and durable API/worker processes. PostgreSQL provides transaction truth, aggregate versions, idempotency, audit, jobs, outbox/inbox and relational projections. Binary content is object-store owned; vector indexes are derived and scope/version keyed.

The shared platform is deliberately small: typed identities/scopes, authentication adapter, authorization evaluator, transaction runner, error/HTTP contracts, durable jobs/events and observability. Domain modules expose public commands, queries and events. They do not share repositories or mutate each other’s tables.

Cross-context workflows use stable references, expected versions, orchestration and events. One aggregate plus its idempotency, audit and outbox records is the normal transaction boundary. There is no universal Deal aggregate and no initial microservice split.

## Security and authority

Authentication binds an IdP subject to a MAI ActorContext. RBAC+ABAC+relationship policy denies before protected loading; field restrictions are applied before DTO assembly. Every resource is tenant/workspace/deal scoped. Human-only and irreversible commands are enforced server-side.

## Synchronous and asynchronous boundary

Fast single-aggregate commands and queries use HTTP. Long, retryable, cancellable or external work uses durable jobs. Domain events are committed through the outbox; integration messages pass through outbox/inbox adapters. Polling is default; SSE is limited to material long-running progress.

## Deployment evolution

The modular monolith may be split only after measured scaling, isolation, ownership or availability evidence and an approved extraction plan. Provider adapters and future event transport remain behind project-owned ports.

## Retained current-state evidence

The Deno server, `src/api/mvp_routes.ts`, in-memory stores, `src/core/db/schema.sql`, LocalPubSubBus and AgentFlowWrapper remain implementation evidence, not target authority. Their complete migration disposition and retirement conditions are in doc-23 and doc-36.

## Detailed authority

- doc-19: product-to-backend gap matrix
- doc-20: contexts, aggregates and state machines
- doc-21: security, persistence, audit and provenance
- doc-22: APIs, jobs, events, agents and integrations
- doc-25–36: proposed decisions
