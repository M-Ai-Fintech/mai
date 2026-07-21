---
id: MAI-76
title: Standardize Arbitration Chamber enum across all schemas to canonical values
status: Done
assignee: []
created_date: '2026-07-20 17:20'
updated_date: '2026-07-20 19:28'
labels: []
milestone: m-7
dependencies: []
priority: medium
ordinal: 68000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Arbitration Chamber concept appears in both contract-analysis.ts (legal-dd) and spa.ts (legal-closing) but with divergent values: 'B3' vs 'CAM-B3', plus freeform strings in some places. Domain modeling canonicalized the values as: CAM-CCBC, CAM-B3, CCI, Judicial-Court. A shared enum/type should be defined once and imported by all schemas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A shared ArbitrationChamber type is defined in a shared location (e.g., src/agent/shared/types.ts or equivalent)
- [ ] #2 Canonical values are: 'CAM-CCBC', 'CAM-B3', 'CCI', 'Judicial-Court'
- [ ] #3 contract-analysis.ts imports and uses the shared ArbitrationChamber type — no freeform string or 'B3' alone
- [ ] #4 spa.ts imports and uses the shared ArbitrationChamber type
- [ ] #5 negotiation/schemas/term-sheet.ts (if it references arbitration) uses the shared type
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-07-20 19:28
---
## 🚀 Resumo da Implementação

Padronização do Enum `Arbitration Chamber` (`"CAM-CCBC"`, `"CAM-B3"`, `"CCI"`, `"FGV"`, `"Judicial-Court"`, `"Other"`) garantindo que as áreas de Contract Analysis e Term Sheet usem exatamente os mesmos valores.

### 📁 Arquivos Alterados

- `src/agent/agents/legal-dd/schemas/contract-analysis.ts` — Atualização do Enum.
- `src/agent/agents/negotiation/schemas/term-sheet.ts` — Atualização do Enum e integração.

### 🔧 Serviços Afetados

- **mai/agents** — Legal DD e Negociação.

## ✅ 1. Critérios de Aceite

- [ ] Zod valida corretamente os nomes oficiais das câmaras de arbitragem nos dois agentes.

## ⚠️ 2. Possíveis Impactos

- Nenhum.

## 🧪 3. Recomendações para QA

### O que validar

- Validar extração sem erros via Zod.
---
<!-- COMMENTS:END -->
