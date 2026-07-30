---
id: doc-28
title: 'Proposed ADR: PostgreSQL Schema and Transaction Strategy'
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 06:34'
---
# Proposed ADR: PostgreSQL Schema and Transaction Strategy

- **Document ID:** doc-28
- **Status:** Proposed
- **Decision owner:** MAI owner

## Context

The prototype schema combines transaction, phase, memory and vectors without complete tenancy, aggregate versioning, durable audit or asynchronous mechanisms.

## Decision

Use PostgreSQL as transactional truth, durable job/event coordination and relational projection store. Give each bounded context an owned schema and migration stream. A transaction changes one aggregate root plus its idempotency record, audit record and outbox events atomically. Cross-context workflows are orchestrated through versioned commands/events and durable jobs; they do not use distributed or cross-context table transactions. Binary content lives in object storage and vectors in a context-owned index keyed by tenant/workspace/deal/document version.

## Alternatives

- One shared public schema: rejected because ownership and access become implicit.
- Database per context now: rejected because operational cost exceeds present isolation needs.
- Document database as transaction truth: rejected because relational integrity, versioning and audit queries dominate.

## Rationale

Context schemas preserve modular ownership while retaining local transactional reliability.

## Consequences

Foreign keys are allowed inside a context; cross-context references use identifiers and application validation. Projection rebuild and reconciliation are first-class. Migrations have one owner and forward/rollback plans.

## Migration implications

Create additive schemas, import and reconcile current PostgreSQL/in-memory records, dual-read only for validation, then cut writers/readers. Never promote seed data or memory output to approved truth.

## Unresolved risks

Physical partitioning, connection pool sizing, archival tiers, exact projection stores and production RPO/RTO require workload evidence.

## Validation plan

Migration tests, repository contract tests, transaction failure injection, cross-context ownership checks, backup/restore exercises and reconciliation reports.
