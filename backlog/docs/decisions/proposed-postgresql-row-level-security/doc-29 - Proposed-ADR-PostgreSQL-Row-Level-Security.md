---
id: doc-29
title: 'Proposed ADR: PostgreSQL Row-Level Security'
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 06:34'
---
# Proposed ADR: PostgreSQL Row-Level Security

- **Document ID:** doc-29
- **Status:** Proposed
- **Decision owner:** MAI owner

## Context

Application policy must express action, relationship, field, purpose, sponsor and expiry. PostgreSQL row-level security can add defense in depth for stable tenant/workspace/deal predicates but cannot safely own the complete decision.

## Decision

Partially adopt PostgreSQL RLS. Application policy remains authoritative and denies before data loading. After schema and policy foundations are proven, enable RLS on high-risk tenant-scoped transaction, evidence/vector metadata, restricted identity, external-access and audit tables using transaction-local trusted scope set by the application. Do not encode full role/action/field workflow policy in RLS and do not rely on RLS for DTO omission. Use separate migration/maintenance roles and fail closed when scope is absent.

## Alternatives

- Adopt RLS as sole authorization: rejected because it cannot fully model workflow authority or safe response shaping.
- Reject RLS: rejected because it forgoes valuable defense against accidental unscoped queries.
- Enable RLS everywhere immediately: rejected because policy complexity could create unsafe gaps and operational deadlocks.
- Defer any decision: rejected; the staged decision and gates are explicit.

## Rationale

Partial adoption gives high-value isolation without splitting policy truth across opaque layers.

## Consequences

Repository tests run with production-like application roles. Scope setup/cleanup must be transaction-safe. Operators require reviewed bypass roles; break-glass is not an ordinary application role.

## Migration implications

Add tenant/workspace/deal keys and indexes, shadow-query policies, run leakage/performance tests, then enable table groups. Roll back policy enablement only through an approved security change; application denial remains active.

## Unresolved risks

Connection-pool scope leakage, policy performance, backup/analytics roles and vector-store enforcement require proof.

## Validation plan

Cross-scope property tests, empty-scope failure tests, pooled-connection reuse tests, query-plan benchmarks and independent security review precede enablement.
