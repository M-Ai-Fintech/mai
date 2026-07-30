---
id: doc-6
title: VDR and Integration Architecture
type: specification
created_date: '2026-07-24 15:35'
updated_date: '2026-07-30 06:37'
tags:
  - architecture
  - vdr
  - integrations
  - canonical
---
# VDR and Integration Architecture

- **Authority ID:** ARCH-INT-001
- **Owner:** Integration Platform
- **Authority:** Canonical target integration architecture proposed by MAI-103
- **Freshness:** Proposed as of 2026-07-30
- **Language:** English
- **Update trigger:** Provider ports/adapters, credentials, capability, retry, residency, retention, health or readiness changes

## Project-owned integration boundary

MAI owns interfaces for VDR/document sources, object storage, AI, embeddings, inference, document conversion/OCR, external communication, identity providers, webhooks and future event transport. Provider payloads are translated by anti-corruption adapters before domain commands.

Connector accounts are tenant/workspace scoped and reference secrets in an approved vault or workload identity. Secrets never enter prompts, browser DTOs, events or logs. Adapters discover capability, enforce request idempotency, bounded retry/timeout/rate limiting, normalize failure, expose health and record audit/provenance.

## VDR and documents

VDR systems are sources, not transaction truth. Document Source and immutable Document Version record provider object/version/checksum, classification and provenance. Synchronization, conversion, extraction, indexing and embeddings are durable jobs. Evidence binds an exact version/location; a provider update creates a new version and targeted staleness.

## External effects

Webhook ingress verifies signature, timestamp and replay before inbox processing. Webhook and communication egress starts only from a persisted human-authorized command, durable job and outbox record. Provider retry cannot broaden recipient, scope or payload.

## Readiness

No provider is production-ready from an interface or mock. Production-candidate/verified states require environment-specific conformance, isolation, security, recovery, residency, retention, health and operational evidence.

## Current implementation

The VDR provider interface and partial adapters are **Adapt**; mocks remain named local fixtures. Direct integrations/tools and local filesystem output are replaced. The complete catalog is doc-22; data/object/vector rules are doc-21 and proposed ADR doc-35.
