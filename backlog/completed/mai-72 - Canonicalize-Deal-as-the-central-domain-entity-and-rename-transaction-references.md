---
id: MAI-72
title: >-
  Canonicalize Deal terminology across business-domain identifiers while
  preserving bounded contexts and transaction semantics
status: Done
assignee:
  - '@antigravity'
created_date: '2026-07-20 17:18'
updated_date: '2026-07-31 17:30'
labels:
  - revalidation
milestone: m-14
dependencies: []
priority: medium
ordinal: 64000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
During the domain modeling session, 'Deal' was established as the canonical term for the core entity (the M&A process between a Buyer and a Target). The DB table is currently named 'transaction' and some agent schemas may still use 'transaction' in variable names or comments. All code references must be aligned to the domain language.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All TypeScript schemas, types, and variable names use 'Deal' (not 'Transaction', 'Operação', or 'Negócio') to refer to the core entity
- [x] #2 '_Avoid_' terms (Transaction, Operação, Negócio) do not appear as domain identifiers in any schema or agent logic
- [x] #3 The primary Deal identifier or contract contains a concise reference to the current governed MAI-103 domain/bounded-context authority
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## MAI-72 Terminology Normalization Correction Notes

### 1. Classified Repository Search
- **Deal-domain terminology requiring correction**:
  - `src/shared/schemas/term-sheet.ts` (`termSheetCoreSchema.shape.dealId`, `targetName`)
  - `src/agent/agents/negotiation/schemas/term-sheet.ts` (`negotiationProposalSchema.shape.dealId`)
  - `src/agent/agents/legal-closing/schemas/spa.ts` (`spaSchema.shape.dealId`)
  - `src/agent/agents/negotiation/schemas/nash-equilibrium.ts` (`nashequilibriumSchema.shape.payoffMatrix.element.shape.proposal`)
  - `src/api/routes/legacy.ts` (`handleKyb`, `handleNegotiation`, `handleDocument` parameter types referencing non-existent `TransactionRepository` export instead of `DealRepository`)
- **Legitimate technical/database transaction terminology preserved**:
  - Platform database runners (`PostgresTransactionRunner`, `withTransaction`)
  - Transactional outbox/inbox (`OutboxRepository`, `InboxRepository`)
  - DB isolation level callbacks (`pg.PoolClient` transaction callbacks)
- **Legitimate legal/financial transaction terminology preserved**:
  - `Licença de Operação (LO)` environmental license standards
  - Legal/regulatory precedent transaction context and M&A documentation guides
- **Legacy SQL table names deferred to MAI-129**:
  - Physical SQL tables (`transaction`, `financial_structure`, `phase_history`, `transaction_business_role`, `transaction_advisor`) and their `transaction_id` columns isolated behind `DealRepository` SQL queries and `integration_tools.ts` fallback tables.

### 2. Files Corrected
- `src/shared/schemas/term-sheet.ts`
- `src/agent/agents/negotiation/schemas/term-sheet.ts`
- `src/agent/agents/legal-closing/schemas/spa.ts`
- `src/agent/agents/negotiation/schemas/nash-equilibrium.ts`
- `src/api/routes/legacy.ts`
- `tests/unit/deal_terminology_enforcement.spec.ts`

### 3. Focused Test Results
- `tests/unit/deal_terminology_enforcement.spec.ts`: 10 passed, 0 failed
- `tests/unit/term_sheet_schema_test.ts`: 8 passed, 0 failed
- `tests/core/target_dossier_memory.spec.ts`: 1 passed (12 steps), 0 failed
- `tests/shared/domain-area.spec.ts`: 10 passed, 0 failed

### 4. Canonical Verification Result
`deno task verify` exited 0 (ALL 17 GATES PASSED):
- PASS Canonical documentation
- PASS I18n Strings Check
- PASS Deno tests
- PASS Frontend design tokens
- PASS Frontend foundation boundary
- PASS Frontend component boundary
- PASS Frontend shell boundary
- PASS Frontend screen families
- PASS Frontend deal intelligence screens
- PASS Frontend deal execution screens
- PASS Frontend Figma-to-code conformance
- PASS GUI unit tests
- PASS Next.js production build
- PASS Frontend principal workflows
- PASS Storybook documentation
- PASS Storybook build
- PASS Storybook interaction tests
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Every applicable acceptance criterion is checked with current evidence
- [x] #2 All focused tests and the repository-wide verification gate pass
- [x] #3 No mock, fallback, or prototype behavior is represented as a real integrated capability
<!-- DOD:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-07-20 19:27
---
## 🚀 Implementation Summary

Refactored the central domain entity from `Transaction` to `Deal` and consolidated terminology. Removed the outdated `ma_flow.ts` in favor of the `mvp_store` flow and updated smoke tests.

### 📁 Changed Files

- `tests/smoke.spec.ts` — Updated to use Deal terminology.
- `src/core/ma_flow.ts` — Removed.

### 🔧 Affected Services

- **mai/core** — Lifecycle flow and E2E tests.

## ✅ 1. Acceptance Criteria

- [ ] The `MvpStore` flow completes the lifecycle using `deal` instead of `transaction`.
- [ ] The smoke test completes every phase without errors.

## ⚠️ 2. Possible Impacts

- Older CLI tools that still query `transaction` may be affected; the E2E test should cover this.

## 🧪 3. QA Recommendations

### What to validate

- Confirm that the complete `deno test` pipeline passes, especially `tests/smoke.spec.ts`.

### Attention Points / Edge Cases

- ⚠️ No direct UI impact; internal flow only.

### Proposed Test Flow

1. Run `deno test -A tests/smoke.spec.ts` and confirm it passes.
---

author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: Canonical Deal terminology is not verified repository-wide and TransactionRepository remains present. All criteria are unchecked. Reopen for exhaustive identifier checks and migration evidence.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Initial implementation merged in PR #30 and corrective terminology enforcement merged in PR #31. Post-merge architecture verification confirmed DealRepository authority, zero TransactionRepository exports, clean Deal terminology in domain schemas, intact transactional outbox/inbox semantics, and legacy SQL tables isolated for MAI-129. Verified with focused tests (tests/unit/deal_terminology_enforcement.spec.ts, tests/unit/term_sheet_schema_test.ts, tests/core/target_dossier_memory.spec.ts, tests/shared/domain-area.spec.ts, tests/core/db/DatabaseMemoryService.spec.ts, tests/core/db/DealRepository.spec.ts), deno lint src/ tests/ scripts/, git diff --check, and deno task verify (17/17 gates passed).
<!-- SECTION:FINAL_SUMMARY:END -->
