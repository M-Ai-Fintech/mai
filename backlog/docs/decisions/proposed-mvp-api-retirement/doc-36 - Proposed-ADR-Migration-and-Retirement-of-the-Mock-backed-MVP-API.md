---
id: doc-36
title: 'Proposed ADR: Migration and Retirement of the Mock-backed MVP API'
type: specification
created_date: '2026-07-30 06:03'
updated_date: '2026-07-30 09:33'
---
# Proposed ADR: Migration and Retirement of the Mock-Backed MVP API

- **Authority ID:** doc-36
- **Owner:** Architecture
- **Authority:** Accepted ADR: Migration and Retirement of the Mock-Backed MVP API
- **Status:** Accepted
- **Freshness:** Accepted as of 2026-07-30; original decision content retained
- **Language:** English
- **Update trigger:** A superseding owner-approved architecture decision, implementation evidence, or a material boundary change
- **Document ID:** doc-36
- **Decision owner:** MAI owner

## Context

The current frontend adapters and backend MVP/legacy routes, universal memory store and prototype PostgreSQL tables demonstrate behavior but are not target constraints.

## Decision

Freeze and inventory MVP/legacy contracts. Build additive target foundations and bounded-context vertical slices. Import current records with explicit source/provenance quality, dual-read only for reconciliation, and single-writer cutover per context. Migrate frontend typed adapters family by family while retaining local fixtures for Storybook/tests. After consumers and data reconcile, stop prototype writers, cut readers, observe rollback, remove runtime registration, and delete retired code in separately approved tasks. Do not create compatibility shims that deform target aggregates or state machines.

## Alternatives

- Big-bang rewrite/cutover: rejected due to unobservable data and workflow risk.
- Permanent compatibility layer: rejected because current routes would remain accidental authority.
- Keep the mock backend indefinitely: rejected because it cannot satisfy product/security semantics.

## Rationale

Incremental vertical slices give testable rollback points while allowing deliberate retirement.

## Consequences

Temporary duplicate read paths and reconciliation tooling exist; only one writer is authoritative. Historical fixtures/tests/docs remain evidence after runtime retirement. Unsupported legacy records import as historical/proposed/unverified.

## Migration implications

Each slice needs mapping, counts/checksums, discrepancy policy, cutover/rollback window and removal proof. Final retirement requires no consumer, write, read or operational dependency.

## Unresolved risks

Legacy production data volume/quality, downtime tolerance, compatibility commitments and rollout tenant order are unknown until implementation discovery.

## Validation plan

Rehearse on representative snapshots; compare counts/hashes/business invariants; exercise rollback; prove no old route/store/schema registration and preserve migration manifests.
