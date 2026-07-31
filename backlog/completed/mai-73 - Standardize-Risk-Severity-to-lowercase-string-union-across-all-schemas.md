---
id: MAI-73
title: Standardize Risk Severity to lowercase string union across all schemas
status: Done
assignee:
  - '@antigravity'
created_date: '2026-07-20 17:19'
updated_date: '2026-07-31 03:29'
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
- [x] #1 risk-matrix.ts severity enum values are lowercase: 'low', 'medium', 'high', 'critical'
- [x] #2 insolvency.ts risk level enum values are lowercase
- [x] #3 contract-analysis.ts risk rating enum values are lowercase
- [x] #4 contingency.ts severity enum values are lowercase
- [x] #5 No uppercase/Title Case severity variants exist in any schema file
- [x] #6 Any existing data migration or adapter ensures stored values are normalized to lowercase
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create src/shared/schemas/risk-severity.ts with riskSeveritySchema, RiskSeverity, and normalizeLegacyRiskSeverity.
2. Update risk-matrix.ts, insolvency.ts, contract-analysis.ts, and contingency.ts to reference shared riskSeveritySchema.
3. Create tests/shared/risk-severity.spec.ts to test canonical values, rejection of Title Case/unknown values, whitespace trimming, casing normalization, and schema imports.
4. Verify persisted-data status (no persisted risk severity records exist).
5. Run tests, deno fmt --check, deno lint, deno check, and deno task verify.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created canonical RiskSeverity schema, type, and normalizeLegacyRiskSeverity in src/shared/schemas/risk-severity.ts. Replaced local Zod enums in risk-matrix.ts, insolvency.ts, contract-analysis.ts, contingency.ts. Added tests in tests/shared/risk-severity.spec.ts. Assessed persisted data: No authoritative persisted risk-severity records currently require a data migration. Future imported legacy values must pass through the compatibility normalizer or the owning context migration.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Every applicable acceptance criterion is checked with current evidence
- [x] #2 All focused tests and the repository-wide verification gate pass
- [x] #3 No mock, fallback, or prototype behavior is represented as a real integrated capability
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

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Standardized risk severity to lowercase string union ('low', 'medium', 'high', 'critical') across all schemas via shared canonical contract src/shared/schemas/risk-severity.ts. Added compatibility normalizer normalizeLegacyRiskSeverity for import/migration boundaries. Verified with 14 focused tests and full deno task verify gate (17/17 checks passed).
<!-- SECTION:FINAL_SUMMARY:END -->
