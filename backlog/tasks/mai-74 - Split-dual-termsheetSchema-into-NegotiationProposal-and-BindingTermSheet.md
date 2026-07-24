---
id: MAI-74
title: Split dual termsheetSchema into NegotiationProposal and BindingTermSheet
status: To Do
assignee: []
created_date: '2026-07-20 17:19'
updated_date: '2026-07-22 05:29'
labels:
  - revalidation
milestone: m-14
dependencies: []
priority: high
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Two different agents export a schema named 'termsheetSchema' with incompatible shapes: negotiation/schemas/term-sheet.ts (mathematical proposal with utilities and Nash data) and legal-closing/schemas/term-sheet.ts (legal document with governing law, exclusivity, etc.). Domain modeling resolved this by defining two distinct concepts: Negotiation Proposal (in-progress offer) and Binding Term Sheet (finalized pre-contract document).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 negotiation/schemas/term-sheet.ts exports 'negotiationProposalSchema' (renamed from termsheetSchema)
- [ ] #2 legal-closing/schemas/term-sheet.ts exports 'bindingTermSheetSchema' (renamed from termsheetSchema)
- [ ] #3 The 'proposal' sub-object nesting in legal-closing is evaluated and either kept or flattened for consistency — decision documented in code comment
- [ ] #4 All agent code importing either schema uses the new names without ambiguity
- [ ] #5 No import-time name collisions exist between the two schemas
<!-- AC:END -->

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

Removed ambiguity from the dual `termsheetSchema` by creating separate schemas for negotiation (`NegotiationProposal`) and the formal binding document (`BindingTermSheet`), sharing common structures from `src/shared/schemas/term-sheet.ts`.

### 📁 Changed Files

- `src/shared/schemas/term-sheet.ts` — Created the unified base schema.
- `src/agent/agents/negotiation/schemas/term-sheet.ts` — Adapted for negotiation.
- `src/agent/agents/legal-closing/schemas/term-sheet.ts` — Created for the final binding Legal Closing document.

### 🔧 Affected Services

- **mai/agents** — NegotiationAgent and LegalClosingAgent.

## ✅ 1. Acceptance Criteria

- [ ] Legal Closing Agent uses a different schema from NegotiationAgent.

## ⚠️ 2. Possible Impacts

- The E2E flow (Sourcing -> Negotiation -> Legal Closing) must ensure smooth conversion from Proposal to Binding Term Sheet.

## 🧪 3. QA Recommendations

### What to validate

- Validate the fiduciary PDF-generation and negotiation pipeline in the CLI.
---

author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The proposal/term-sheet split is partially present, but all criteria are unchecked and conversion between NegotiationProposal and BindingTermSheet is not proven end-to-end. Reopen for explicit mapping tests.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->
