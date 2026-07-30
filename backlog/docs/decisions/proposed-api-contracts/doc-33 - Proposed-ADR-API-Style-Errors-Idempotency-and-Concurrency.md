---
id: doc-33
title: 'Proposed ADR: API Style, Errors, Idempotency, and Concurrency'
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 09:33'
---
# Proposed ADR: API Style, Errors, Idempotency, and Concurrency

- **Authority ID:** doc-33
- **Owner:** Architecture
- **Authority:** Accepted ADR: API Style, Errors, Idempotency, and Concurrency
- **Status:** Accepted
- **Freshness:** Accepted as of 2026-07-30; original decision content retained
- **Language:** English
- **Update trigger:** A superseding owner-approved architecture decision, implementation evidence, or a material boundary change
- **Document ID:** doc-33
- **Decision owner:** MAI owner

## Context

The approved UI exposes workflow actions and stale/conflict/error states. Current endpoints are mixed CRUD, generic engines and legacy compatibility routes.

## Decision

Adopt versioned JSON HTTP APIs under `/api/v1`. Use resource queries and named semantic command endpoints for transitions; do not expose generic status updates or destructive Deal delete. Use the envelopes/error codes in doc-22, opaque cursor pagination by default, allow-listed filters/sorts/search, ETag/If-Match, and mandatory idempotency for creates/commands/jobs/side effects. Return identical `404 PROTECTED_NOT_FOUND` for absent and unauthorized protected objects. Slow/external work returns `202` with durable operation/job references.

## Alternatives

- Preserve MVP routes: rejected because existing shape is not authority.
- Generic CRUD: rejected because invariants and consequences become implicit.
- GraphQL initially: rejected because it does not remove command/policy/version needs and complicates field authorization.
- gRPC for browser APIs: rejected.

## Rationale

The contract is explicit, debuggable and directly expresses frontend workflow semantics and concurrency.

## Consequences

Clients handle stale/conflict/idempotent replay and async status. DTOs are read models, not serialized aggregates. OpenAPI/schema generation may follow implementation but cannot replace domain contracts.

## Migration implications

Frontend typed adapters move family by family; legacy endpoints are frozen, inventoried, deprecated and retired without shaping v1.

## Unresolved risks

Payload size, bulk-operation needs, cursor lifetime and API evolution policy require implementation measurements.

## Validation plan

Contract tests for every family/error, unauthorized-existence equivalence, ETag races, idempotent replay and approved frontend workflow adapter tests.
