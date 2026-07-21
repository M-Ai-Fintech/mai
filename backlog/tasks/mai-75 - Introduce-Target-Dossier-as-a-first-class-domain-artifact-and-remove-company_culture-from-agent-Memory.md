---
id: MAI-75
title: >-
  Introduce Target Dossier as a first-class domain artifact and remove
  company_culture from agent Memory
status: Done
assignee: []
created_date: '2026-07-20 17:20'
updated_date: '2026-07-20 19:28'
labels: []
milestone: m-7
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
- [ ] #1 memorySchema category enum contains exactly 'domain_knowledge' and 'user_preference' — 'company_culture' is removed
- [ ] #2 BrokerOrchestratorService.processUserCorrection no longer handles 'company_culture' as a memory category
- [ ] #3 A new TargetDossierSchema (or equivalent) is defined, containing: VDR document references, business knowledge, Company Culture profile, and dealId
- [ ] #4 Company Culture profile is stored as a sub-field of Target Dossier, not as a standalone memory entry
- [ ] #5 SourcingAndKYBAgent produces a Target Dossier output (or partial dossier) rather than a flat KYB report
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-07-20 19:28
---
## 🚀 Resumo da Implementação

Criação do `TargetDossier` como uma entidade explícita (first-class domain artifact) de Due Diligence, removendo a `company_culture` da memória solta dos agentes. Adicionadas as rotas backend e a view React na interface gráfica (GUI).

### 📁 Arquivos Alterados

- `gui/components/screens/entities/TargetDossier.tsx` — Nova tela do Dossier (GUI).
- `gui/components/screens/entities/EntityDetail.tsx` — Adicionada tab de Dossier.
- `src/api/routes/entities_team.ts`, `src/api/mvp_store.ts`, `src/api/store/entities.ts`, `src/api/store/state.ts`, `src/api/store/types.ts` — Rotas e gerenciamento de estado.
- `gui/lib/api-client.ts` — Contratos e funções `getTargetDossier` e `updateTargetDossier`.

### 🔧 Serviços Afetados

- **mai/core** e **mai/gui** — Backend APIs e Frontend Web.

## ✅ 1. Critérios de Aceite

- [ ] A interface web agora exibe uma Tab dedicada ao "Target Dossier" para a entidade.
- [ ] O modelo `TargetDossier` persiste corretamente via API.

## ⚠️ 2. Possíveis Impactos

- Quebras de layout na tela de detalhes da entidade (EntityDetail).
- Possível falta de sincronia se múltiplos agentes atualizarem o Dossier simultaneamente.

## 🧪 3. Recomendações para QA

### O que validar

- Acesse a interface web na tela de detalhes da Entidade e navegue até a aba "Dossier". Teste atualizar as informações.
---
<!-- COMMENTS:END -->
