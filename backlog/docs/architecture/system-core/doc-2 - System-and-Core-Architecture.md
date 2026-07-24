---
id: doc-2
title: System and Core Architecture
type: specification
created_date: '2026-07-24 15:35'
updated_date: '2026-07-24 15:50'
tags:
  - architecture
  - core
  - canonical
---
# System and Core Architecture

- **Authority ID:** ARCH-SYS-001
- **Owner:** Platform Architecture
- **Authority:** Canonical current-state architecture
- **Freshness:** Current for the Deno MVP documented by MAI-84
- **Language:** English
- **Update trigger:** Runtime entry points, core service boundaries, bootstrap behavior, persistence mode, event transport, or deployment-state classification changes.

Source code is authoritative where this document and implementation differ.

## Runtime boundary

The MVP is a TypeScript/Deno monolith. `src/main.ts` boots the CLI application through `AppBootstrapper`; `src/api/server.ts` starts the HTTP server on port 8000. The Next.js GUI is a separate `gui/` application and reaches the Deno API through its configured `/api/*` rewrite.

The core initialization sequence in `src/core/boot.ts` creates the process-local `LocalPubSubBus`, obtains the singleton `DatabaseMemoryService`, checks the AI-provider configuration, and attempts to load `models/ma_classifier_q8.onnx`. Database, AI, and ONNX availability are independently degradable: bootstrap logs failures and keeps the process running. Individual callers must still handle unavailable dependencies.

## Current component map

```text
CLI / HTTP API / GUI adapter
        │
        ├── Agent layer (src/agent)
        ├── Domain API adapter and in-memory MVP store (src/api)
        ├── Core: PostgreSQL repositories, local event bus, VDR providers
        └── Engines: prediction, optimization, document generation
```

`LocalPubSubBus` in `src/core/pubsub/` is the current in-process asynchronous-event abstraction. `AgentFlowWrapper` can record flow checkpoints, but a complete externally durable, at-least-once workflow is not a current production guarantee.

The HTTP server also retains several legacy endpoints (`/api/kyb`, `/api/predict`, `/api/portfolio`, `/api/negotiate`, and `/api/document`) after trying the deterministic MVP route adapter. New product-facing route work belongs in `src/api/mvp_routes.ts` and its ordered domain handlers; handler ordering is observable matching behavior.

## Dependency and resilience rules

- Obtain agent-memory persistence via `DatabaseMemoryService.getInstance()`; `src/core/db/memory_service.ts` is a compatibility re-export.
- The PostgreSQL service has a real `pg` pool and caches an offline state after connection failure. It is not the persistence backend for the in-memory MVP route store.
- The local event bus is a migration seam, not Google Cloud Pub/Sub itself.
- The ONNX artifact is optional at boot but required for live ONNX inference calls.
- AI calls use the provider configuration documented in Local Setup; without a key, the agent entry point substitutes dry-run behavior.

## Future architecture boundary

GCP services, Vertex AI, Cloud Run, Cloud Storage, BigQuery, Cloud Pub/Sub, replicas, and CMEK are future-target architecture, not deployed MVP components. Preserve abstraction boundaries so those adapters can be introduced deliberately; do not document them as active services.

See also: Agent Architecture and Workflows, Data and Memory Architecture, Engine Architecture, VDR and Integration Architecture, and MVP GUI and API Behavior.
