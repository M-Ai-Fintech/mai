---
id: MAI-75
title: >-
  Introduce Target Dossier as a first-class domain artifact and remove
  company_culture from agent Memory
status: In Progress
assignee:
  - '@antigravity'
created_date: '2026-07-20 17:20'
updated_date: '2026-07-31 17:12'
labels:
  - revalidation
milestone: m-10
dependencies: []
priority: medium
ordinal: 67000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Domain modeling revealed that 'company_culture' was incorrectly placed inside the BrokerOrchestrator's Memory system (which should only store domain_knowledge and user_preference). A Target Dossier is the correct concept: a comprehensive deliverable artifact per deal that aggregates VDR documents, business knowledge, decisions, and the Company Culture profile of the target. The memory schema and broker service must be reconciled to remove company_culture from the Memory enum, and a new TargetDossier type must be introduced.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 memorySchema category enum contains exactly 'domain_knowledge' and 'user_preference' — 'company_culture' is removed
- [x] #2 BrokerOrchestratorService.processUserCorrection no longer handles 'company_culture' as a memory category
- [x] #3 A new TargetDossierSchema (or equivalent) is defined, containing: VDR document references, business knowledge, Company Culture profile, and dealId
- [x] #4 Company Culture profile is stored as a sub-field of Target Dossier, not as a standalone memory entry
- [x] #5 SourcingAndKYBAgent produces a Target Dossier output (or partial dossier) rather than a flat KYB report
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## MAI-75 Active Company Culture Memory API Removal Notes

### 1. Architectural Correction & Active API Removal
- The initial MAI-75 implementation removed agent-facing correction routing and tool actions, but left active production service methods and similarity-search exports.
- Removed active APIs from TypeScript codebase:
  - `CompanyCultureMemoryRecord`
  - `SimilarCultureMemory`
  - `DatabaseMemoryService.getCompanyCultureMemory`
  - `DatabaseMemoryService.saveCompanyCultureMemory`
  - `DatabaseMemoryService.searchSimilarCultureMemory`
  - `CultureEmbeddingRow`
  - `cultureSearch`
  - `CULTURE_VECTOR_SQL`
  - `CULTURE_FALLBACK_SQL`
  - Removed associated active imports/exports and CLI usage in `src/cli/registry-command.ts`.

### 2. Legacy Storage & MAI-129 Boundary
- Physical SQL table `company_culture_memory` and its indices remain intact in `src/core/db/schema.sql` carrying an explicit isolation comment:
  `-- Legacy company-culture memory storage retained only for MAI-129 migration and retirement. It is not an active agent-memory contract.`
- Physical schema migration and table deletion are owned by MAI-129. No active runtime code path performs reads, writes, vector searches, or tool actions against `company_culture_memory`.

### 3. Target Dossier Boundary Preserved
- `cultureProfile` sub-object preserved as a domain projection inside `targetDossierDraftSchema` (`src/shared/schemas/target-dossier.ts`).
- Target Dossier draft remains proposed, unapproved, and non-authoritative (`proposalStatus: { isProposed: true, isApproved: false, isAuthoritative: false }`).

### 4. Focused Test Results
- `tests/core/target_dossier_memory.spec.ts`: 1 passed (15 steps), 0 failed
- `tests/core/db/DatabaseMemoryService.spec.ts`: 1 passed (2 steps), 0 failed

### 5. Canonical Verification Result
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
- [ ] #1 Every applicable acceptance criterion is checked with current evidence
- [ ] #2 All focused tests and the repository-wide verification gate pass
- [ ] #3 No mock, fallback, or prototype behavior is represented as a real integrated capability
<!-- DOD:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-07-20 19:28
---
## 🚀 Implementation Summary

Created `TargetDossier` as an explicit first-class Due Diligence domain artifact, removing `company_culture` from unstructured agent memory. Added backend routes and a React GUI view.

### 📁 Changed Files

- `gui/components/screens/entities/TargetDossier.tsx` — New Dossier GUI screen.
- `gui/components/screens/entities/EntityDetail.tsx` — Added the Dossier tab.
- `src/api/routes/entities_team.ts`, `src/api/mvp_store.ts`, `src/api/store/entities.ts`, `src/api/store/state.ts`, `src/api/store/types.ts` — Routes and state management.
- `gui/lib/api-client.ts` — Contracts and `getTargetDossier`/`updateTargetDossier` functions.

### 🔧 Affected Services

- **mai/core** and **mai/gui** — Backend APIs and web frontend.

## ✅ 1. Acceptance Criteria

- [ ] The web interface displays a dedicated Target Dossier tab for the entity.
- [ ] The `TargetDossier` model persists correctly through the API.

## ⚠️ 2. Possible Impacts

- Layout regressions on the EntityDetail screen.
- Possible synchronization issues if multiple agents update the Dossier concurrently.

## 🧪 3. QA Recommendations

### What to validate

- Open the entity-details web screen, navigate to the Dossier tab, and test updating its information.
---

author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The implementation contradicts the task: company_culture remains accepted and persisted as agent memory, while Target Dossier lacks the complete VDR/business/culture artifact and agent production path. Reopen.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->
