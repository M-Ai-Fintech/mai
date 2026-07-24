---
id: doc-6
title: VDR and Integration Architecture
type: specification
created_date: '2026-07-24 15:35'
updated_date: '2026-07-24 15:51'
tags:
  - architecture
  - vdr
  - integrations
  - canonical
---
# VDR and Integration Architecture

- **Authority ID:** ARCH-INT-001
- **Owner:** Integration Platform
- **Authority:** Canonical current-state VDR and integration architecture
- **Freshness:** Current for provider adapters and integration seams documented by MAI-84
- **Language:** English
- **Update trigger:** VDR provider contracts, proxy behavior, event adapters, external service activation, credential boundaries, or integration maturity changes.

Provider implementations and environment configuration are authoritative for credentials and API details.

## VDR provider contract

`VDRProvider` in `src/core/vdr/provider.ts` defines four operations: list documents, download document bytes, retrieve metadata, and upload a document. The normalized `VDRDocument` contract contains ID, name, size, MIME type, optional folder ID, and timestamps.

Current provider implementations include Papermark, iDeals, Intralinks, and a local mock. They are adapters with varying implementation completeness; listing a provider module does not certify a live production integration.

`BaseVDRProvider` can route requests through a configured Supergood proxy. When `proxyUrl` is set, it sends the target URL in `x-supergood-target-url` and forwards configured Supergood API/client headers. Secrets are read from environment configuration and must never be placed in documentation, source, or client responses.

## Agent and RAG access

The agent action layer exposes a local Pub/Sub-compatible tool for VDR-access requests and engine triggers. In the MVP this publishes on `LocalPubSubBus`; it may obtain documents from the mock VDR service for its request-access branch. It is not a Google Cloud Pub/Sub client.

`ClientSiloedRAG` can retrieve document content from a local folder or an iDeals/Intralinks provider, chunk it, and restrict retrieval by deal. Provider bytes are decoded as text in the current path; rich-document extraction and universal binary processing remain future work.

## Integration inventory

- **AI provider:** Google API-key lookup and dry-run fallback are implemented by `AIProvider`; model and search-grounding capabilities are not guaranteed merely by a historical architecture claim.
- **PostgreSQL:** `DatabaseMemoryService` is the active database service; it is not an MCP Toolbox server.
- **Transformers/ONNX:** Local engine packages provide embedding and inference behavior; they are not an installed Hugging Face MCP server.
- **Events:** `LocalPubSubBus` is an in-process migration seam; Google Cloud Pub/Sub is a future deployment target.

Describe a service as integrated only when the corresponding adapter is configured, tested, and active in the target environment. Future GCP/Vertex architecture belongs in a future-state decision or deployment plan, not this current-state document.
