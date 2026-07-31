---
id: MAI-77
title: >-
  Unify Risk, Contingency, and Conditions Precedent categories under a single
  Domain Area taxonomy
status: Done
assignee:
  - '@luis'
created_date: '2026-07-20 17:20'
updated_date: '2026-07-31 17:30'
labels:
  - revalidation
milestone: m-14
dependencies: []
priority: high
ordinal: 69000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Three separate category lists exist for essentially the same domain areas: risk-matrix.ts has 7 categories (financial, tax, legal, labor, operational, tech, environmental), contingency.ts has 5 (Civil, Labor, Tax, Regulatory, Environmental), and conditions-precedent.ts has 8 (regulatory, corporate, financial, tax, labor, operational, legal, third-party-consent). Domain modeling established a single shared DomainArea taxonomy: corporate, financial, tax, labor, civil, regulatory, environmental, operational, tech, commercial. All three schemas must use this shared type.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A shared DomainArea type is defined once (e.g., src/agent/shared/types.ts) with canonical lowercase values: 'corporate', 'financial', 'tax', 'labor', 'civil', 'regulatory', 'environmental', 'operational', 'tech', 'commercial'
- [x] #2 risk-matrix.ts riskCategory uses DomainArea
- [x] #3 contingency.ts category uses DomainArea
- [x] #4 conditions-precedent.ts category uses DomainArea
- [x] #5 Old disjoint category enums are removed from all three schema files
- [x] #6 All agents that produce or consume these schemas are updated to use the new shared type
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Unified DomainArea taxonomy to exact 10 canonical values (corporate, financial, tax, labor, civil, regulatory, environmental, operational, tech, commercial). Defined normalizeLegacyDomainArea normalizer for legacy values. Added tests/shared/domain-area.spec.ts. All tests and deno task verify passed cleanly.
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

Unified the domain taxonomy for Risk Matrix, Contingency, and Conditions Precedent under one global `DomainArea` enum (`corporate`, `financial`, `labor`, `tax`, `civil`, etc.).

### 📁 Changed Files

- `src/shared/schemas/domain-area.ts` — New base `DomainArea` type.
- `src/agent/agents/legal-closing/schemas/conditions-precedent.ts` — Updated to use `DomainArea`.
- `src/agent/agents/legal-dd/schemas/contingency.ts` — Updated to use `DomainArea`.
- `src/agent/agents/general-dd/schemas/risk-matrix.ts` — Updated to use `DomainArea`.
- `tests/e2e/cli.spec.ts` — Removed fragility from the portfolio-recommendation test.

### 🔧 Affected Services

- **mai/agents** — Base data models.

## ✅ 1. Acceptance Criteria

- [ ] All three taxonomies import the same centralized `DomainArea` list.

## ⚠️ 2. Possible Impacts

- Complex tests may regress if the LLM mock returns CamelCase while Gemini extraction now expects lowercase.

## 🧪 3. QA Recommendations

### What to validate

- Validate displays in the `negotiate` CLI flow and risk report.
---

author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: A shared DomainArea appears to exist, but every acceptance criterion is unchecked and all producers/consumers have not been verified. Reopen for exhaustive schema and agent contract tests.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Unified Risk Matrix, Contingency, and Conditions Precedent under canonical DomainArea taxonomy, merged in PR #29. Post-merge verification confirmed: 1) domainAreaSchema contains exactly 10 canonical values: corporate, financial, tax, labor, civil, regulatory, environmental, operational, tech, commercial; 2) 'legal' and 'third-party-consent' are explicitly rejected; 3) normalizeLegacyDomainArea converts supported legacy strings and rejects ambiguous categories; 4) Risk Matrix, Contingency, and Conditions Precedent schemas all import the shared contract while RiskSeverity remains unchanged. Validated via tests/shared/domain-area.spec.ts (10 passed) and deno task verify (17/17 gates passed).
<!-- SECTION:FINAL_SUMMARY:END -->
