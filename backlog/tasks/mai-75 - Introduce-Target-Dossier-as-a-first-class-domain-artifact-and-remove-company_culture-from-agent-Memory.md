---
id: MAI-75
title: >-
  Introduce Target Dossier as a first-class domain artifact and remove
  company_culture from agent Memory
status: In Progress
assignee:
  - '@luis'
created_date: '2026-07-20 17:20'
updated_date: '2026-07-31 12:10'
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
ARCHITECTURE CORRECTION:
- Target Dossier is a deal-scoped product artifact/projection.
- It is not agent memory.
- An agent may produce a typed partial dossier proposal.
- An agent does not own or authoritatively persist the final Target Dossier.
- Authoritative persistence, evidence linkage, concurrency, and projections belong to the new bounded-context architecture.
- Physical removal of legacy database tables belongs to MAI-129.

IMPLEMENTATION EVIDENCE & VERIFICATION:
1. memorySchema accepts domain_knowledge & user_preference; rejects company_culture.
2. Active memory tools (databaseMemoryServiceTool) expose no company-culture actions.
3. BrokerOrchestratorService.processUserCorrection validates correctionType and rejects company_culture.
4. Target Dossier proposal schema (targetDossierDraftSchema) defined under src/shared/schemas/target-dossier.ts with dealId, targetIdentity, documentReferences, businessKnowledge, cultureProfile (sub-object), completeness, provenance, and proposalStatus (isProposed: true, isApproved: false, isAuthoritative: false).
5. SourcingAndKYBAgent outputSchema & instructions updated to produce targetDossierProposal.
6. Legacy tables (company_culture_memory) remain intact in SQL schema for MAI-129 physical cleanup; no active memory code path loads or persists company culture as agent memory.
7. Verification gate 'deno task verify' ran and passed all 17 verification steps cleanly.
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
