---
id: doc-9
title: MVP GUI and API Behavior
type: specification
created_date: '2026-07-24 15:35'
updated_date: '2026-07-30 06:37'
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
- **Authority:** Approved frontend workflow is product authority; backend target contracts are proposed by MAI-103
- **Freshness:** Proposed backend alignment as of 2026-07-30
- **Language:** English
- **Update trigger:** Approved screen state/action/permission semantics, frontend route ownership, backend contracts or fixture cutover changes

## Product authority

The 25 banker-workspace screen families, application shell/route architecture, MAI-102 authority matrix, screen contracts, MAI-99/100/101 fixtures/stories/tests/verifiers, design/1–28 and accepted MAI-102 deviations define visible states, actions, permissions, evidence/provenance, staleness, human authority and external isolation.

Accepted MAI-102 deviations remain valid: MAI-100 responsive non-Decision states and MAI-101 shared-pattern derived responsive families are implementation-owned governed derivations. MAI-103 does not change frontend behavior, Figma or route ownership.

## Backend contract direction

The target API uses semantic commands and permission-safe read models under `/api/v1`, stable protected errors, ETag/If-Match, idempotency and durable jobs. It does not treat an existing MVP route, in-memory state or database table as canonical.

Every protected request is tenant/workspace/deal scoped and authorized before data loading. AI output stays proposed/draft until a separate human-authorized state change. External portal DTOs omit internal strategy and require purpose, sponsor, expiry and object scope.

Doc-19 is the complete screen/action/state/permission/workflow gap matrix. Doc-22 is the API/job/event catalog. Doc-20 and doc-21 define workflow, authority, persistence and isolation.

## Current implementation boundary

The Deno MVP API, legacy endpoints, mock stores, seeded dashboard/chat/engine runs and frontend fixtures are deterministic prototype evidence only. The frontend remains fixture-backed until separately approved implementation tasks migrate each typed adapter. Current routes continue to be documented in doc-23 for migration and retirement; they are not target compatibility constraints.

## Verification boundary

Existing frontend tests and `gui/scripts/verify-frontend-workflows.mjs` protect the approved experience during later adapter migration. Backend implementation must add contract, state-machine, authorization, isolation, concurrency, job, audit and end-to-end evidence before any production-readiness claim.
