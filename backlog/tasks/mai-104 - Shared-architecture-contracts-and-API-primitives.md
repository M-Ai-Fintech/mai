---
id: MAI-104
title: Shared architecture contracts and API primitives
status: In Progress
assignee: []
created_date: '2026-07-30 09:24'
updated_date: '2026-07-30 10:32'
labels:
  - backend
  - architecture
  - wave-1
  - api
  - mai-85-initiative
milestone: m-12
dependencies: []
documentation:
  - >-
    backlog/docs/architecture/backend-redesign/implementation-plan/doc-24 -
    MAI-103-Backend-Implementation-Plan.md
  - >-
    backlog/docs/decisions/proposed-modular-monolith-boundaries/doc-25 -
    Proposed-ADR-Target-Modular-Monolith-and-Service-Boundaries.md
  - >-
    backlog/docs/decisions/proposed-bounded-contexts-aggregate-ownership/doc-26
    - Proposed-ADR-Bounded-Contexts-and-Aggregate-Ownership.md
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
modified_files:
  - src/shared/contracts/identifiers.ts
  - src/shared/contracts/request_context.ts
  - src/shared/contracts/ports.ts
  - src/shared/contracts/aggregate_version.ts
  - src/shared/contracts/validation.ts
  - src/platform/api/v1.ts
  - src/platform/api/concurrency.ts
  - src/platform/api/headers.ts
  - src/platform/api/envelopes.ts
  - tests/shared/architecture_contracts.spec.ts
  - tests/platform/api/v1_contracts.spec.ts
priority: high
ordinal: 90000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Temporary plan identifier: BE-P01

Objective
Establish the versioned shared architecture contracts that all backend bounded contexts consume.

Exact scope
- Branded IDs; actor, tenant, workspace and deal scope context.
- Command/query ports; stable success, error, page and job envelopes.
- Correlation, idempotency and ETag/If-Match parsing conventions.
- Contract validation and canonical API conventions.

Explicit exclusions
No domain handler, authentication provider, database schema, job runner, frontend adapter, Figma, or feature implementation outside the shared contract boundary.

Required ADRs
doc-25, doc-26 and doc-33.

Likely subsystems
`src/shared`, new `src/platform/api`, contract tests.

Deliverables
Versioned shared package, validation/error tests and API conventions.

Migration, rollout and rollback
Additive package with no runtime cutover; rollback is import adoption reversal.

Complexity and coordination
Medium; serial Wave 1 foundation. Recommended model: gpt-5.6-terra, High reasoning. No special review gate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shared contracts reject malformed identifiers, scope contexts, headers and envelopes.
- [x] #2 Stable error, pagination, idempotency and ETag contracts are covered by tests.
- [x] #3 The package is additive and creates no domain handler, schema, provider or frontend behavior change.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preserve the MAI-103 approved baseline and implement one additive v1 public surface under src/shared and src/platform/api, separate from legacy MVP API contracts.\n2. Work test-first at the public seams: identifier parser/serializer, scope context constructor, typed command/query ports, v1 envelopes/error catalog, correlation/idempotency values, and ETag/If-Match conversion.\n3. Add focused Deno contract tests and a compile-time consumer fixture that imports only the v1 entrypoint; do not add routes, handlers, persistence, authentication, authorization, providers, workers, GUI, or migration shims.\n4. Run focused contract tests during implementation, then one final format/lint/diff/canonical verification pass; perform one compact boundary audit.\n5. Record exact modified files, verification, additive migration and import-reversal rollback evidence; commit, push, and open one Draft PR while keeping MAI-104 In Progress.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TDD slice 1: added the additive src/platform/api/v1.ts public entrypoint and shared branded identifier parsers/serializers. Chosen minimal documented convention for unguided ID syntax: required kind prefixes (actor_, tenant_, workspace_, deal_, cor_, idem_, op_, job_), lowercase alphanumeric hyphen-separated suffix, and 64-character maximum. Focused test: DENO_ENV=test deno test --allow-read tests/shared/architecture_contracts.spec.ts (exit 0; 2 passed).

TDD slices 2-4: added data-only request-context validation, typed command/query ports, typed validation failures, /api/v1 success/error/opaque-cursor/accepted-job envelopes, stable error-status catalog, correlation/idempotency header conventions, and strong ETag/If-Match parsing. The v1 public entrypoint is the sole intended consumer import. Focused test after formatting: DENO_ENV=test deno test --allow-read tests/shared/architecture_contracts.spec.ts tests/platform/api/v1_contracts.spec.ts (exit 0; 9 passed). Graphify hook outputs were restored to HEAD because they are explicitly out of scope.

Final candidate evidence: git diff --check=0; focused contracts=0 (9 passed); deno task verify=0 (all 17 canonical checks passed). Global deno fmt --check=1 due 801 pre-existing repository files and global deno lint=1 due 609 pre-existing repository-wide violations, including GUI and installed skill assets; scoped MAI-104 format and lint checks both passed. Final boundary audit found 0 open P0/P1. Additive rollout: future MAI-105/MAI-106 consumers import only src/platform/api/v1.ts; rollback is removal of those consumer imports, with no runtime cutover or data migration. MAI-105 and MAI-106 were not started.

Owner-review handoff: committed 094d323 (feat(MAI-104): add shared architecture and API contracts), pushed feat/MAI-104-shared-architecture-contracts-api-primitives, and opened Draft PR https://github.com/luisfelipeluis49/mai/pull/24 against master. MAI-104 remains In Progress pending owner review; no self-approval, merge, or MAI-105/MAI-106 execution.
<!-- SECTION:NOTES:END -->
