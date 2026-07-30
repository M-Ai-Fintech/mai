---
id: doc-4
title: Data and Memory Architecture
type: specification
created_date: '2026-07-24 15:35'
updated_date: '2026-07-30 06:37'
tags:
  - architecture
  - data
  - memory
  - canonical
---
# Data and Memory Architecture

- **Authority ID:** ARCH-DATA-001
- **Owner:** Data Platform
- **Authority:** Canonical target data architecture proposed by MAI-103
- **Freshness:** Proposed as of 2026-07-30
- **Language:** English
- **Update trigger:** Context schema ownership, concurrency, truth taxonomy, audit/provenance, retention, object/vector storage or recovery objectives change

## Ownership and transaction truth

PostgreSQL is transaction truth, durable coordination and projection storage. Each bounded context owns its schema and migrations. A normal transaction writes one versioned aggregate, idempotency result, immutable audit record and outbox events. Cross-context references are IDs plus expected versions, never transactionally owned objects.

## Truth taxonomy

Source documents and their versions are immutable source records. Evidence/citations bind exact locations and hashes. Approved facts are versioned and superseded, not overwritten. Interpretations, assumptions, calculations and model recommendations remain distinct derived records. Human Decision Records are immutable authority. Generated drafts are not released deliverables; release manifests are immutable. Audit is append-only.

## Staleness and history

New source versions emit targeted invalidation events. Dependents retain original inputs and history while current projections report `current`, `stale`, `invalidated` or `superseded`. No history is destructively rewritten to create a current view.

## Storage boundaries

Document metadata and provenance are relational. Binary objects live in versioned object storage. Vector indexes are derived projections isolated by tenant/workspace/deal/document version/classification and are rebuildable. Cache keys and jobs carry the same scope.

## Durability and lifecycle

Idempotency, outbox, inbox, jobs, attempts and dead letters are durable. Retention, archive, legal hold and deletion requests coordinate every context/object/index and produce immutable manifests. Proposed objectives are RPO no greater than five minutes and RTO no greater than four hours, subject to production infrastructure approval and recovery exercise.

## Retained current-state evidence

The current `schema.sql`, TransactionRepository, DatabaseMemoryService and in-memory MVP stores are classified in doc-23. They do not constrain target tables or boundaries. Migration/reconciliation is defined by doc-21, doc-24 and proposed ADR doc-36.
