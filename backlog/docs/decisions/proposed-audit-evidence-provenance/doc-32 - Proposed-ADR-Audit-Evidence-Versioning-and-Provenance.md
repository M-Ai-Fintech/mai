---
id: doc-32
title: 'Proposed ADR: Audit, Evidence, Versioning, and Provenance'
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 06:34'
---
# Proposed ADR: Audit, Evidence, Versioning, and Provenance

- **Document ID:** doc-32
- **Status:** Proposed
- **Decision owner:** MAI owner

## Context

MAI decisions depend on source documents, derived evidence, facts, interpretations, assumptions, calculations, recommendations and human authority. Destructive rewriting would make reconstruction impossible.

## Decision

Store immutable document versions, evidence locations/hashes, approved fact versions, calculation inputs/results, human Decision Records, release manifests and append-only Audit Events. Provenance links every derived object to exact source versions, actor/tool/model/prompt and operation. Supersession and invalidation append links/events and update current projections; they never rewrite history. Audit redaction is an authorized overlay preserving event identity and reason. Generated drafts and model recommendations are never transaction truth or human decisions.

## Alternatives

- Mutable current rows only: rejected.
- Full event sourcing for all state: rejected; selected immutable records plus current aggregates are sufficient.
- Store only model output text: rejected because evidence and reproducibility are absent.

## Rationale

The design separates truth categories and supports defensible reconstruction, staleness and exact-version approval.

## Consequences

Storage grows append-only; retention/legal-hold and permission-safe projections are required. Derived outputs can be stale while historical records remain queryable to authorized auditors.

## Migration implications

Legacy data receives explicit provenance quality. Unsupported outputs import as historical/proposed, never approved. Reindexing creates new index versions.

## Unresolved risks

Audit redaction law/policy, prompt-content retention, evidence excerpt policy and long-term archive tier need owner/legal decisions.

## Validation plan

Reconstruct representative decisions end to end; prove immutability, targeted invalidation, permission-safe audit views and restore from backup.
