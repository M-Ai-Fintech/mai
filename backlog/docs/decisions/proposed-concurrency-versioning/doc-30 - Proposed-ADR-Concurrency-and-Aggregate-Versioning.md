---
id: doc-30
title: 'Proposed ADR: Concurrency and Aggregate Versioning'
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 06:34'
---
# Proposed ADR: Concurrency and Aggregate Versioning

- **Document ID:** doc-30
- **Status:** Proposed
- **Decision owner:** MAI owner

## Context

Approvals, facts, scenarios, proposals and closing decisions must refer to exact reviewed state. Prototype stores allow unversioned mutation and last-write-wins behavior.

## Decision

Every mutable aggregate has a monotonic version updated atomically. APIs expose `ETag: "vN"` and require `If-Match` for material commands. Commands name expected versions for referenced approval-sensitive aggregates. Creates and all side effects require an idempotency key scoped to actor, command and target; replay returns the original result and a payload mismatch returns `IDEMPOTENCY_CONFLICT`. Immutable versions/decisions are appended, never overwritten.

## Alternatives

- Last-write-wins: rejected because it silently invalidates human review.
- Database locks exposed to user sessions: rejected due to latency and failure behavior.
- Event sourcing for every aggregate: rejected as disproportionate.

## Rationale

Optimistic concurrency is explicit in UI and API, scales to normal banker collaboration and preserves exact review packages.

## Consequences

Version conflicts return safe comparison information and preserve user drafts. Projection versions/watermarks are distinct from aggregate versions. Jobs recheck referenced versions before work and effects.

## Migration implications

Imported aggregates start with recorded migration version and source manifest. Legacy uncertain updates are not reconstructed as approved history.

## Unresolved risks

Conflict UX for complex multi-aggregate commands and retention duration for idempotency results need measured policy.

## Validation plan

Concurrent-writer, replay, mismatched-key, stale-reference, retry-after-timeout and exact-approval-package tests.
