---
id: doc-4
title: Data and Memory Architecture
type: specification
created_date: '2026-07-24 15:35'
updated_date: '2026-07-24 15:50'
tags:
  - architecture
  - data
  - memory
  - canonical
---
# Data and Memory Architecture

- **Authority ID:** ARCH-DATA-001
- **Owner:** Data Platform
- **Authority:** Canonical data ownership and memory-boundary architecture
- **Freshness:** Current for the PostgreSQL schema and MVP stores documented by MAI-84
- **Language:** English
- **Update trigger:** Database schema, persistence ownership, memory taxonomy, embedding dimensions, RAG silo behavior, or MVP-store durability changes.

`src/core/db/schema.sql`, runtime repositories, and Zod contracts are executable authority.

## Data stores

PostgreSQL is the relational store defined by `src/core/db/schema.sql`. Core business records include transactions, businesses, advisors, transaction/business roles, financial structures, phases, phase history, and flow checkpoints. The schema enables `uuid-ossp` and `vector` and defines vector columns at dimension 384.

The MVP HTTP route adapter has a separate in-memory store in `src/api/store/`. Its entities, deals, notifications, layouts, and chat state reset when the API process restarts. It is intentionally not evidence that these product routes persist to PostgreSQL.

## Memory segregation

`phase_history` records operational phase progression. It must not be used as a substitute for durable agent memory. Separate memory tables are:

- `user_preferences` — broker/user preference records;
- `domain_knowledge` — reusable domain knowledge by category;
- `company_culture_memory` — business-linked cultural observations;
- `vdr_document_chunks` — deal-scoped retrieved-document chunks and embeddings.

`DatabaseMemoryService` owns pooled PostgreSQL access, JSONB queries, writes, and vector retrieval. Use `getInstance()` for shared process access. The service can be offline; callers must retain safe fallback behavior instead of treating a failed connection as persistence success.

## RAG boundary

`ClientSiloedRAG` in `src/agent/rag_layer.ts` partitions document retrieval by `dealId`. It chunks loaded VDR/local text, creates embeddings through `TransformersEngine`, persists chunks where possible, and falls back to an in-memory per-deal silo when persistence fails. This is a development resilience mechanism, not a cross-process durability guarantee.

The present implementation reads local `.txt` and `.md` sources directly, or lists/downloads from supported VDR providers. It does not establish a universal binary-extraction or production document-governance pipeline.

## Data rules

- Keep user preferences, domain knowledge, culture memory, operational history, and VDR chunks distinct.
- Scope RAG queries by deal ID and do not merge client/document silos without an explicit authorization model.
- Treat embeddings as sensitive derived data.
- Use API contracts for browser-facing DTOs; do not leak server file paths in VDR/download behavior.

See M&A Domain Model for business concepts and VDR and Integration Architecture for provider access.
