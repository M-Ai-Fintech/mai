---
id: doc-9
title: MVP GUI and API Behavior
type: specification
created_date: '2026-07-24 15:35'
updated_date: '2026-07-24 15:51'
tags:
  - product
  - gui
  - api
  - mvp
  - canonical
---
# MVP GUI and API Behavior

- **Authority ID:** PRODUCT-MVP-001
- **Owner:** Product Engineering
- **Authority:** Canonical current-state MVP GUI and API behavior
- **Freshness:** Current for the Next.js GUI and deterministic MVP API documented by MAI-84
- **Language:** English
- **Update trigger:** Product routes, API contracts, persistence behavior, streaming behavior, concurrency semantics, or product capability boundaries change.

Route handlers, Zod contracts, tests, and GUI code are authoritative for exact behavior.

## Product surfaces

The Next.js App Router application is in `gui/`. Current page routes include the dashboard (`/`), deals (`/deals`, `/deals/[id]`), entities (`/entities`, `/entities/[id]`), custom dashboard (`/dashboard/custom`), generative UI (`/generative-ui`), settings (`/settings`), and a `/clients` compatibility page. Route availability and redirects must be verified in source before making navigation claims.

The GUI calls relative `/api/*` paths. Its Next configuration rewrites these to the Deno API base URL, defaulting to `http://127.0.0.1:8000`. Browser components must not hard-code internal Deno URLs.

Storybook MDX and `gui/docs/` are referenced implementation/design assets. They document component behavior and prototype constraints but do not replace this canonical product/API authority.

## Deterministic MVP API

`src/api/mvp_routes.ts` composes ordered handlers for entities/team, deals, chat, engines/documents, notifications, and dashboards. The API uses Zod contracts and stable JSON error envelopes. The server identifies mock-backed in-memory persistence with `X-MAI-Persistence` and exposes resource-version headers for optimistic-concurrency workflows.

Current route families include:

| Family | Examples |
| --- | --- |
| Entities and team | `/api/entities`, `/api/entities/:id`, `/api/team-members`, deal team assignments |
| Deals | `/api/deals`, `/api/deals/:id`, phase transitions |
| Chat | deal chat threads, messages, and stream endpoint |
| Engine/document/VDR | deal engine runs, VDR documents, document creation/download metadata |
| Notifications | `/api/notifications`, notification updates |
| Dashboard layouts | `/api/users/me/dashboard-layouts/:slug` |

Read the route modules under `src/api/routes/` for exact methods and payload contracts. The adapter returns `null` for paths outside its boundary, allowing the HTTP server’s retained legacy endpoints to handle their existing routes.

## Interaction and persistence behavior

The MVP store is process-local in memory. Optimistic updates apply to supported deal, entity, assignment, and layout operations; a version conflict must preserve local edits and request explicit reload rather than silently overwrite them.

Chat supports a streaming endpoint and uses injected execution dependencies. In the running server, chat invokes the broker orchestration path; without an API key, that path is dry-run/fallback. The API must not claim citations, external search grounding, or persisted chat history beyond the code path actually configured.

VDR-facing API output exposes controlled metadata/download behavior; it must not disclose server filesystem paths. Authentication and authorization are not implemented by the current deterministic MVP route layer.

## Change rules

Add new product routes through the appropriate handler while preserving `mvp_routes.ts` ordering. Update API contracts, tests, and this document together for behavior changes. Keep prototype-only content, visual specifications, and component-level Storybook narratives colocated in the GUI unless their policy becomes product-wide authority.
