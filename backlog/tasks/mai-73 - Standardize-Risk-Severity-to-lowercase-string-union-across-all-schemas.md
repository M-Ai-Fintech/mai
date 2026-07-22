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
## 🚀 Resumo da Implementação

Padronização dos enums de severidade de risco (`Risk Severity`) para minúsculas (`low`, `medium`, `high`, `critical`) em todos os schemas (contingência, insolvência e análise de contrato), facilitando a inferência pelo LLM e reduzindo ambiguidades.

### 📁 Arquivos Alterados

- `src/agent/actions.ts` — Ajuste no Enum `riskLevel` para minúsculas.
- `src/agent/agents/financial-risk/schemas/insolvency.ts` — Ajuste no schema.
- `src/agent/agents/legal-dd/schemas/contingency.ts` — Ajuste no schema.
- `src/agent/agents/legal-dd/schemas/contract-analysis.ts` — Ajuste no schema.

### 🔧 Serviços Afetados

- **mai/agents** — Schemas de extração e tools.

## ✅ 1. Critérios de Aceite

- [ ] A severidade é extraída em minúsculas por todas as tools.
- [ ] Os agentes validam os dados contra os schemas sem falhas Zod.

## ⚠️ 2. Possíveis Impactos

- Agentes de VDR Extraction podem falhar se tentarem forçar output capitalizado.

## 🧪 3. Recomendações para QA

### O que validar

- Valide via CLI que extrações de risco (ex: prediction) retornam `low`, `medium`, `high` ou `critical` corretamente formatados.
---

author: @codex
created: 2026-07-22 05:29
---
## Rebaseline audit — 2026-07-22\n\nCurrent status: The lowercase risk work may be partially implemented, but every acceptance criterion is unchecked and no migration/normalization proof is recorded. Reopen for targeted schema and persisted-data tests.\n\nReason for reopening: the previous Done state does not satisfy the agreed definitive gate. Existing completion checkmarks are cleared pending fresh evidence. Before returning to Done, every applicable acceptance criterion and Definition of Done item must be verified, relevant tests must exist and pass, and mock/prototype boundaries must be explicit.
---
<!-- COMMENTS:END -->
