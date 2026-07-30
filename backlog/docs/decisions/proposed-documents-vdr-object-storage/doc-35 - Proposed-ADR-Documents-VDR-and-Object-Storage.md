---
id: doc-35
title: 'Proposed ADR: Documents, VDR, and Object Storage'
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 06:34'
---
# Proposed ADR: Documents, VDR, and Object Storage

- **Document ID:** doc-35
- **Status:** Proposed
- **Decision owner:** MAI owner

## Context

Source documents and versions drive evidence and decisions. Current VDR mocks/partial adapters, local content and vector memory do not provide complete version, isolation, residency or production-readiness guarantees.

## Decision

Documents own metadata; immutable Document Versions own source identity, checksum, classification and object reference. Binary content resides in a versioned object store with retention/legal-hold controls. VDR providers implement the project-owned `DocumentSourceProvider` through tenant-scoped Connector Accounts, capability discovery, normalized errors, cursors and exact provider versions. Processing produces versioned derived artifacts. Evidence binds exact document version/location. Vector indexes are derived, versioned and keyed by tenant/workspace/deal/document version/classification. No adapter is production-ready until environment-specific conformance, security, recovery and operational evidence passes.

## Alternatives

- Store binaries in PostgreSQL: rejected for primary binary ownership.
- Treat VDR as canonical transaction truth: rejected; it is a source system.
- One shared vector index with filter-only isolation: rejected.
- Preserve mock route shape: rejected.

## Rationale

The split preserves source fidelity, scalable binary storage, deterministic provenance and isolation.

## Consequences

Uploads/sync/processing are jobs; changes create new versions, not overwrites. Retrieval checks source and evidence authorization. Deletion/retention spans metadata, objects, indexes and manifests.

## Migration implications

Inventory/checksum current files and VDR fixture records, import as explicit sources, reprocess/reindex, reconcile, then retire prototype storage paths.

## Unresolved risks

Object-store/VDR/OCR providers, regional placement, file-size limits, malware scanning and signed-URL duration need infrastructure and security approval.

## Validation plan

Provider conformance, checksum/version, cross-scope retrieval, stale processing, object restore, retention/hold and failure/retry tests.
