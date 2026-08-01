---
id: MAI-147
title: Define the canonical dispute-resolution mechanism contract and legacy adapters
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-31 05:06'
updated_date: '2026-08-01 12:00'
labels:
  - backend
  - architecture
  - legal
  - contracts
  - negotiation
  - closing
  - migration
  - delivery-wave-a
milestone: m-12
dependencies: []
modified_files:
  - >-
    backlog/docs/decisions/proposed-api-contracts/doc-33 -
    Proposed-ADR-API-Style-Errors-Idempotency-and-Concurrency.md
  - >-
    backlog/docs/decisions/proposed-concurrency-versioning/doc-30 -
    Proposed-ADR-Concurrency-and-Aggregate-Versioning.md
  - backlog/docs/domain/domain-model/doc-7 - MA-Domain-Model.md
  - backlog/tasks/mai-129 - Data-migration-and-MVP-retirement.md
  - >-
    backlog/tasks/mai-147 -
    Define-the-canonical-dispute-resolution-mechanism-contract-and-legacy-adapters.md
  - src/agent/agents/legal-closing/schemas/spa.ts
  - src/agent/agents/legal-closing/schemas/term-sheet.ts
  - src/agent/agents/legal-dd/schemas/contract-analysis.ts
  - src/agent/agents/negotiation/schemas/term-sheet.ts
  - src/api/contracts/dispute-resolution.ts
  - src/api/contracts/index.ts
  - src/shared/schemas/dispute-resolution.ts
  - tests/shared/dispute-resolution.spec.ts
  - tests/shared/risk-severity.spec.ts
  - tests/unit/term_sheet_schema_test.ts
priority: high
ordinal: 10700
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the narrow and internally inconsistent MAI-76 arbitration-chamber task with a correct shared legal contract.

The target concept is a dispute-resolution mechanism, not merely an arbitration chamber.

The canonical representation must distinguish arbitration from court litigation and support controlled representation of non-canonical arbitration institutions.

This task owns:
- the shared authoritative schema;
- arbitration-institution vocabulary;
- court-resolution representation;
- explicit “other institution” representation;
- legacy normalization;
- compatibility adapters;
- migration and API contract guidance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 One authoritative shared dispute-resolution schema exists.
- [x] #2 Arbitration and court litigation are represented as structurally distinct variants.
- [x] #3 The arbitration variant references a canonical institution contract.
- [x] #4 Non-canonical institutions use an explicit structure containing their supplied name rather than a literal authoritative enum value of `Other`.
- [x] #5 Court litigation supports the jurisdiction and forum fields required by the approved legal workflow.
- [x] #6 The canonical arbitration-institution list is explicitly reviewed against existing product and legal requirements.
- [x] #7 Existing legacy values are inventoried, including at minimum: B3, CAM-B3, CAM-CCBC, CCI, FGV, Judicial-Court, and Other.
- [x] #8 Legacy adapters normalize unambiguous values.
- [x] #9 Unknown or ambiguous legacy values are rejected or require explicit human resolution; they are never silently guessed.
- [x] #10 `Judicial-Court` maps to the court variant, not an arbitration institution.
- [x] #11 Contract Analysis, Negotiation Term Sheet, and SPA/Closing contracts use or are migrated toward the shared representation.
- [x] #12 Agent proposal schemas reference the canonical contract.
- [x] #13 API and persistence representations are versioned and documented.
- [x] #14 Migration ownership is recorded for MAI-129.
- [x] #15 Tests cover every canonical arbitration institution, court representation, explicit other institution, every legacy normalization, ambiguous-input rejection, serialization and parsing, and compatibility behavior.
- [x] #16 Focused tests and `deno task verify` pass.
<!-- AC:END -->



## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add one shared src/shared/schemas/dispute-resolution.ts contract with distinct arbitration/court variants, reviewed canonical institutions, explicit other-institution naming, versioned API/persistence envelope, parser/serializer, and legacy normalization that requires court details or other-institution names.
2. Migrate Legal DD Contract Analysis, Negotiation Term Sheet/proposal, and Legal Closing SPA/binding term-sheet schemas to the shared contract; remove independent dispute-resolution enums and expose the versioned contract through the API contract barrel.
3. Add exhaustive focused tests for canonical institutions, court jurisdiction/forum, explicit other institutions, every required legacy value, ambiguity rejection, Judicial-Court routing, parsing/serialization, and consumer compatibility; record MAI-129 as the physical migration owner.
4. Run focused schema tests and deno task verify, update Backlog evidence and acceptance checks only for proven criteria, then create the authorized PR and stop before merge or Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Discovery complete: current legal-dd, negotiation, and legal-closing schemas contain contradictory local dispute-resolution enums. Graphify was explicitly excluded by the prompt; focused rg/source inspection was used. Local ownership is clear on delivery/MAI-147-dispute-resolution-contract. Remote duplicate/PR verification was unavailable because GitHub/network access failed and Backlog remote fetch could not write the worktree FETCH_HEAD.

Implementation and verification evidence (2026-08-01):
- Focused schema command `DENO_ENV=test deno test --env --allow-read --allow-write --allow-env --allow-ffi --allow-run --allow-net tests/shared/dispute-resolution.spec.ts tests/shared/risk-severity.spec.ts tests/unit/term_sheet_schema_test.ts` passed: 24 passed, 0 failed, exit 0.
- `deno task test` passed: 265 passed across 25 steps, 21 ignored, 0 failed, exit 0.
- `deno fmt --check` passed for the 10 changed/new Deno and TypeScript source/test files.
- `git diff --check` passed.
- Final elevated `deno task verify` passed with exit 0. Every reported gate passed: canonical documentation, i18n, Deno tests, frontend token/foundation/component/shell/screen/conformance checks, GUI unit tests, Next production build, principal workflows, and Storybook documentation/build/interaction tests.
- GUI dependencies were installed with `npm --prefix gui ci` because the sandbox could not spawn the package installer. npm reported 7 audit findings (3 moderate, 4 high); no audit fixes were applied because dependency remediation is outside this task.
- The prompt explicitly excluded Graphify, so discovery used focused source inspection and rg. Remote duplicate/PR verification remains unavailable because GitHub/network access failed and Backlog remote fetch could not write the shared worktree FETCH_HEAD; local branch ownership is clear.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Every acceptance criterion is checked with evidence.
- [x] #2 One shared dispute-resolution contract is authoritative.
- [x] #3 Arbitration and court mechanisms cannot be confused.
- [x] #4 Existing schemas no longer maintain contradictory independent enums.
- [x] #5 Legacy values have tested adapters or explicit rejection behavior.
- [x] #6 MAI-118, MAI-119, MAI-121, and MAI-129 depend on MAI-147.
- [x] #7 Canonical repository verification passes.
<!-- DOD:END -->
