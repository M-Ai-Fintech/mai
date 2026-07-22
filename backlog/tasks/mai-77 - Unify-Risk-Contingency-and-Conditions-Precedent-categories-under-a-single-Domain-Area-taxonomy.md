---
id: MAI-77
title: >-
  Unify Risk, Contingency, and Conditions Precedent categories under a single
  Domain Area taxonomy
status: To Do
assignee: []
created_date: '2026-07-20 17:20'
updated_date: '2026-07-22 05:29'
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
- [ ] #1 A shared DomainArea type is defined once (e.g., src/agent/shared/types.ts) with canonical lowercase values: 'corporate', 'financial', 'tax', 'labor', 'civil', 'regulatory', 'environmental', 'operational', 'tech', 'commercial'
- [ ] #2 risk-matrix.ts riskCategory uses DomainArea
- [ ] #3 contingency.ts category uses DomainArea
- [ ] #4 conditions-precedent.ts category uses DomainArea
- [ ] #5 Old disjoint category enums are removed from all three schema files
- [ ] #6 All agents that produce or consume these schemas are updated to use the new shared type
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
## 🚀 Resumo da Implementação

Unificação da taxonomia de domínios entre Riscos (Risk Matrix), Passivos (Contingency) e Condições Precedentes em um único enumerador global `DomainArea` (`corporate`, `financial`, `labor`, `tax`, `civil`, etc.).

### 📁 Arquivos Alterados

- `src/shared/schemas/domain-area.ts` — Novo tipo base `DomainArea`.
- `src/agent/agents/legal-closing/schemas/conditions-precedent.ts` — Atualizado para usar `DomainArea`.
- `src/agent/agents/legal-dd/schemas/contingency.ts` — Atualizado para usar `DomainArea`.
- `src/agent/agents/general-dd/schemas/risk-matrix.ts` — Atualizado para usar `DomainArea`.
- `tests/e2e/cli.spec.ts` — Ajuste de fragilidade no teste de recomendação de Portfolio.

### 🔧 Serviços Afetados

- **mai/agents** — Modelos de Dados base.

## ✅ 1. Critérios de Aceite

- [ ] As 3 taxonomias importam a mesma lista `DomainArea` centralizada.

## ⚠️ 2. Possíveis Impactos

- Possível regressão em extrações do Gemini (agora minúsculas) em testes complexos caso o mock do LLM retorne CamelCase.

## 🧪 3. Recomendações para QA

### O que validar

- Valide as exibições no fluxo CLI de `negotiate` e extrato de Risco.
---

author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: A shared DomainArea appears to exist, but every acceptance criterion is unchecked and all producers/consumers have not been verified. Reopen for exhaustive schema and agent contract tests.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->
