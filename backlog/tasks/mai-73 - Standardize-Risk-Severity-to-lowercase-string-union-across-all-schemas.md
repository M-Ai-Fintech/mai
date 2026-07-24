---
id: MAI-73
title: Standardize Risk Severity to lowercase string union across all schemas
status: To Do
assignee: []
created_date: '2026-07-20 17:19'
updated_date: '2026-07-22 05:29'
labels:
  - revalidation
milestone: m-14
dependencies: []
priority: high
ordinal: 65000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The risk severity enum is inconsistent across the codebase: risk-matrix.ts uses lowercase ('low', 'medium', 'high', 'critical') while insolvency.ts, contract-analysis.ts, and contingency.ts use Title Case ('Low', 'Medium', 'High', 'Critical'). This will cause cross-agent comparison bugs. The canonical standard agreed is lowercase for all internal TypeScript string unions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 risk-matrix.ts severity enum values are lowercase: 'low', 'medium', 'high', 'critical'
- [ ] #2 insolvency.ts risk level enum values are lowercase
- [ ] #3 contract-analysis.ts risk rating enum values are lowercase
- [ ] #4 contingency.ts severity enum values are lowercase
- [ ] #5 No uppercase/Title Case severity variants exist in any schema file
- [ ] #6 Any existing data migration or adapter ensures stored values are normalized to lowercase
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

Standardized risk-severity enums to lowercase (`low`, `medium`, `high`, `critical`) across contingency, insolvency, and contract-analysis schemas, simplifying LLM inference and reducing ambiguity.

### 📁 Changed Files

- `src/agent/actions.ts` — Changed the `riskLevel` enum to lowercase.
- `src/agent/agents/financial-risk/schemas/insolvency.ts` — Updated the schema.
- `src/agent/agents/legal-dd/schemas/contingency.ts` — Updated the schema.
- `src/agent/agents/legal-dd/schemas/contract-analysis.ts` — Updated the schema.

### 🔧 Affected Services

- **mai/agents** — Extraction schemas and tools.

## ✅ 1. Acceptance Criteria

- [ ] Every tool extracts severity in lowercase.
- [ ] Agents validate data against the schemas without Zod failures.

## ⚠️ 2. Possible Impacts

- VDR Extraction agents may fail if they force capitalized output.

## 🧪 3. QA Recommendations

### What to validate

- Use the CLI to confirm that risk extraction (for example, prediction) returns correctly formatted `low`, `medium`, `high`, or `critical` values.
---

author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The lowercase risk work may be partially implemented, but every acceptance criterion is unchecked and no migration/normalization proof is recorded. Reopen for targeted schema and persisted-data tests.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->
