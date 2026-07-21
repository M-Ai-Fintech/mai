---
id: MAI-73
title: Standardize Risk Severity to lowercase string union across all schemas
status: Done
assignee: []
created_date: '2026-07-20 17:19'
updated_date: '2026-07-20 19:28'
labels: []
milestone: m-7
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
<!-- COMMENTS:END -->
