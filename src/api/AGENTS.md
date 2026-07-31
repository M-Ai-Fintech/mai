# API Subsystem Agent Instructions (`src/api/`)

This directory contains the HTTP REST and WebSocket API server, endpoint routes,
contract definitions, and in-memory/persistent store accessors for the MAI
platform.

## Architecture & Submodules

- **`server.ts`**: Entry point for the Deno HTTP API server. Configures HTTP
  routing, middleware, CORS, and request dispatching.
- **`mvp_routes.ts`**: MVP route handler dispatching agent, KYB, prediction, and
  deal operations directly.
- **`mvp_store.ts`**: MVP state management, store error definitions, agent ID
  constants, and data access abstractions.
- **`contracts/`**: Strongly-typed API interface contracts and schema
  definitions (`chat.ts`, `deals.ts`, `dashboard.ts`, `engines.ts`,
  `entities.ts`, `notifications.ts`, `http.ts`, `common.ts`).
- **`routes/`**: Modular endpoint route handlers processing HTTP requests
  (`chat.ts`, `deals.ts`, `dashboard.ts`, `dependencies.ts`,
  `engines_documents.ts`, `entities_team.ts`, `notifications.ts`).
- **`store/`**: Data access layer and state management (`state.ts`,
  `accessors.ts`, `deals.ts`, `team.ts`, `notifications.ts`, `seed.ts`). Handles
  both in-memory MVP state and database persistence synchronization.

## Runtime Environment & Commands

- **Runtime**: Deno runtime (`deno.json`).
- **Start API Server**: `deno task api:start` (runs
  `deno run --env --allow-read --allow-write --allow-env --allow-net --allow-ffi --allow-run src/api/server.ts`).
- **Run API Unit/Contract Tests**:
  `deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net tests/api/`

## Key Interfaces & Operational Patterns

- **Contract First**: All API endpoints must adhere strictly to request/response
  types defined in `src/api/contracts/`.
- **Store Accessors**: Direct mutation of state is prohibited. Route handlers
  must interact with state via standard accessors in
  `src/api/store/accessors.ts` or `src/api/mvp_store.ts`.
- **Standard HTTP Responses**: API responses must return structured JSON
  envelopes with standard HTTP status codes (`200 OK`, `400 Bad Request`,
  `404 Not Found`, `500 Internal Error`).

## Documentation Governance

Canonical API specification documentation lives under
[`backlog/docs/`](../../backlog/docs/index/doc-10%20-%20Documentation-Index-and-Information-Architecture.md)
(specifically `doc-06-API-Specification.md`). This file provides directory-local
implementation guidance.
